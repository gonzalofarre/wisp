import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { apiFetch, ApiError, SESSION_EXPIRED_EVENT } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { IconButton } from '@/shared/IconButton/IconButton'
import { StatusDot } from '@/shared/StatusDot/StatusDot'
import { MessageList } from '../MessageList/MessageList'
import { MessageInput } from '../MessageInput/MessageInput'
import type { ChatMessage, MediaStatus } from '../../types'
import { PENDING_MEDIA_STORAGE_KEY, type PendingMedia } from '../../pendingMedia'
import styles from './ChatScreen.module.css'

interface ChatResponse {
  chatId: string
  recipientId: string
}

interface LocationState {
  recipientId?: string
}

interface JoinAck {
  ok: boolean
  messages?: ChatMessage[]
  recipientOnline?: boolean
  error?: string
}

interface SendAck {
  ok: boolean
  error?: string
}

interface MediaStatusAck {
  ok: boolean
  error?: string
}

interface MediaStatusEvent {
  messageId: string
  status: MediaStatus
}

interface PresenceEvent {
  sessionId: string
  online: boolean
}

interface DeliveredEvent {
  chatId: string
  deliveredTo: string
}

export function ChatScreen() {
  const { chatId } = useParams<{ chatId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useSession()

  const stateRecipientId = (location.state as LocationState | null)?.recipientId
  const [recipientId, setRecipientId] = useState<string | null>(stateRecipientId ?? null)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [recipientOnline, setRecipientOnline] = useState(false)
  // Media que se subió en MediaPreviewScreen y quedó esperando a que el socket termine
  // de unirse a la room para poder mandarla — se consume una sola vez, ver pendingMedia.ts.
  const pendingMediaIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    if (!chatId) return
    const raw = sessionStorage.getItem(PENDING_MEDIA_STORAGE_KEY)
    if (!raw) return
    sessionStorage.removeItem(PENDING_MEDIA_STORAGE_KEY)

    try {
      const pending = JSON.parse(raw) as PendingMedia
      if (pending.chatId === chatId) pendingMediaIdRef.current = pending.mediaId
    } catch {
      // valor corrupto — se ignora, no hay nada que reenviar
    }
  }, [chatId])

  // Si se llega directo a la URL (recarga, link) sin venir de NewChatScreen, no hay
  // recipientId en el state del router — lo resolvemos contra el backend, que también
  // confirma que la sesión actual es participante de este chat.
  useEffect(() => {
    if (stateRecipientId || !session || !chatId) return

    let cancelled = false
    apiFetch<ChatResponse>(`/chat/${chatId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((chat) => {
        if (!cancelled) setRecipientId(chat.recipientId)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Chat not found')
      })

    return () => {
      cancelled = true
    }
  }, [chatId, session, stateRecipientId])

  // Un socket por chat abierto: se conecta al entrar y se desconecta al salir. La
  // reconexión (caída de red, backend reiniciando) la maneja socket.io-client solo; en
  // cada "connect" (inicial o luego de reconectar) volvemos a unirnos a la room del chat
  // y pedimos el historial completo, así el estado local nunca queda desincronizado.
  useEffect(() => {
    if (!session || !chatId) return

    const socket = getSocket()
    const ownId = session.id
    socket.auth = { token: session.token }

    function handleConnect() {
      socket.emit('chat:join', { chatId }, (ack: JoinAck) => {
        if (!ack.ok) {
          setError(ack.error ?? 'Could not join the chat')
          return
        }

        setMessages(ack.messages ?? [])
        setIsConnected(true)
        setRecipientOnline(ack.recipientOnline ?? false)

        const pendingMediaId = pendingMediaIdRef.current
        if (pendingMediaId) {
          pendingMediaIdRef.current = undefined
          socket.emit('chat:message', { chatId, mediaId: pendingMediaId }, (sendAck: SendAck) => {
            if (!sendAck.ok) setError(sendAck.error ?? 'Message could not be sent')
          })
        }
      })
    }

    function handleDisconnect() {
      setIsConnected(false)
    }

    function handleIncomingMessage(message: ChatMessage) {
      if (message.chatId === chatId) {
        setMessages((current) => [...current, message])
      }
    }

    // El servidor le pega este evento a toda la room (destinatario y remitente) apenas
    // se resuelve un "View once" o "Delete" — así las dos burbujas del mismo mensaje
    // quedan de acuerdo en que el adjunto ya no está, sin importar quién lo resolvió.
    function handleMediaStatus({ messageId, status }: MediaStatusEvent) {
      setMessages((current) =>
        current.map((message) => (message.id === messageId ? { ...message, mediaStatus: status } : message)),
      )
    }

    // Solo hay dos participantes en un chat 1:1 — cualquier cambio de presencia que no
    // sea el mío propio es, por descarte, el del otro lado. Comparar contra `session.id`
    // (estable en esta closure) en vez de contra `recipientId` (que puede resolverse
    // async en el otro efecto y quedar desactualizado acá) evita un falso negativo.
    function handlePresence({ sessionId, online }: PresenceEvent) {
      if (sessionId !== ownId) setRecipientOnline(online)
    }

    // Se dispara cuando el otro lado se une al chat (en vivo o poniéndose al día) y
    // todo lo que yo le mandé antes pasa a entregado — un check se vuelve doble check gris.
    function handleDelivered({ chatId: eventChatId, deliveredTo }: DeliveredEvent) {
      if (eventChatId !== chatId) return
      setMessages((current) =>
        current.map((message) => (message.senderId !== deliveredTo ? { ...message, delivered: true } : message)),
      )
    }

    // El servidor emite esto cuando el token dejó de ser válido (sesión vencida por TTL)
    // antes de cortar la conexión — mismo evento global que usa apiFetch ante un 401, así
    // SessionProvider cierra la sesión sin importar si el corte vino de un fetch o del socket.
    function handleSessionExpired() {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('chat:message', handleIncomingMessage)
    socket.on('chat:media-status', handleMediaStatus)
    socket.on('presence:update', handlePresence)
    socket.on('chat:delivered', handleDelivered)
    socket.on('session:expired', handleSessionExpired)

    socket.connect()

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('chat:message', handleIncomingMessage)
      socket.off('chat:media-status', handleMediaStatus)
      socket.off('presence:update', handlePresence)
      socket.off('chat:delivered', handleDelivered)
      socket.off('session:expired', handleSessionExpired)
      socket.disconnect()
    }
  }, [chatId, session])

  function handleSend(text: string) {
    if (!chatId) return
    getSocket().emit('chat:message', { chatId, text }, (ack: SendAck) => {
      if (!ack.ok) setError(ack.error ?? 'Message could not be sent')
    })
  }

  // No actualiza `messages` acá directamente — el broadcast que el servidor manda de
  // vuelta a la room (handleMediaStatus arriba) es la única fuente de verdad para
  // mediaStatus, así el remitente y el destinatario nunca pueden quedar en desacuerdo.
  // Esta función solo reporta si el pedido falló.
  function resolveMediaStatus(messageId: string, status: MediaStatus): Promise<string | undefined> {
    if (!chatId) return Promise.resolve('Not connected')
    return new Promise((resolve) => {
      getSocket().emit('chat:media-status', { chatId, messageId, status }, (ack: MediaStatusAck) => {
        resolve(ack.ok ? undefined : (ack.error ?? 'Could not update this attachment'))
      })
    })
  }

  function handleAttach(file: File) {
    if (!chatId) return
    navigate(`/chat/${chatId}/media-preview`, { state: { file } })
  }

  if (error) {
    return (
      <div className={styles.root}>
        <header className={styles.header}>
          <IconButton aria-label="Back" onClick={() => navigate('/home')}>
            <ArrowLeft size={20} />
          </IconButton>
        </header>
        <p className={styles.error}>{error}</p>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <IconButton aria-label="Back" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </IconButton>
        <div className={styles.recipientInfo}>
          <span className={styles.recipientId}>{recipientId ?? 'Connecting…'}</span>
          {recipientId && (
            <span className={styles.presence}>
              <StatusDot status={recipientOnline ? 'online' : 'offline'} />
              {recipientOnline ? 'Online' : 'Offline'}
            </span>
          )}
        </div>
      </header>

      {!isConnected && <p className={styles.reconnecting}>Connecting…</p>}
      <p className={styles.ephemeralNotice}>Messages disappear a few minutes after they're sent</p>

      <MessageList messages={messages} ownId={session?.id ?? ''} onMediaStatusChange={resolveMediaStatus} />
      <MessageInput onSend={handleSend} onAttach={handleAttach} disabled={!isConnected} />
    </div>
  )
}
