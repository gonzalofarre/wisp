import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'
import { apiFetch, ApiError } from '@/lib/api'
import { Button } from '@/shared/Button/Button'
import { Card } from '@/shared/Card/Card'
import { BottomNav, type BottomNavTab } from '@/shared/BottomNav/BottomNav'
import { SessionIdDisplay } from '@/modules/welcome/components/SessionIdDisplay/SessionIdDisplay'
import type { MessageKind } from '@/modules/chat/types'
import { ChatRequestCard } from '../ChatRequestCard/ChatRequestCard'
import { ChatListItem } from '../ChatListItem/ChatListItem'
import styles from './HomeScreen.module.css'

interface PendingRequest {
  chatId: string
  fromId: string
  createdAt: number
}

interface ChatSummary {
  chatId: string
  recipientId: string
  recipientOnline: boolean
  lastMessage?: { kind: MessageKind; text?: string; createdAt: number }
  unreadCount: number
}

const MEDIA_PREVIEW_LABEL: Record<Exclude<MessageKind, 'text'>, string> = {
  image: 'Sent a photo',
  video: 'Sent a video',
  audio: 'Sent an audio message',
  document: 'Sent a document',
}

function describeLastMessage(message: ChatSummary['lastMessage']): string {
  if (!message) return 'No messages yet'
  if (message.kind === 'text') return message.text ?? ''
  return MEDIA_PREVIEW_LABEL[message.kind]
}

// No hay socket abierto en Home todavía (solo ChatScreen conecta uno, por chat) — un
// poll simple cada 4s es más simple y más seguro que sumarle a Home el ciclo de vida
// de una conexión persistente compartida entre pantallas. Se puede migrar a push real
// más adelante si hace falta que sea instantáneo.
const REQUESTS_POLL_INTERVAL_MS = 4000

export function HomeScreen() {
  const { session, endSession, refreshSession, isRefreshing, error } = useSession()
  const navigate = useNavigate()
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  useEffect(() => {
    if (!session) return
    const token = session.token
    let cancelled = false

    // Un solo tick pide las dos cosas — no tiene sentido que el badge de no leídos y el
    // punto online/offline (acá) y las solicitudes pendientes queden desincronizados
    // entre sí por correr en pollers separados.
    async function poll() {
      const [requestsResult, chatsResult] = await Promise.allSettled([
        apiFetch<PendingRequest[]>('/chat/requests', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch<ChatSummary[]>('/chat', { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (cancelled) return
      // Silencioso a propósito en caso de error: un poll fallido no debe tapar la
      // pantalla — se reintenta solo en el próximo tick.
      if (requestsResult.status === 'fulfilled') setPendingRequests(requestsResult.value)
      if (chatsResult.status === 'fulfilled') setChats(chatsResult.value)
    }

    poll()
    const interval = setInterval(poll, REQUESTS_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [session])

  async function handleAccept(chatId: string, fromId: string) {
    if (!session) return
    setRequestError(null)
    setRespondingId(chatId)
    try {
      await apiFetch(`/chat/${chatId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      navigate(`/chat/${chatId}`, { state: { recipientId: fromId } })
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.message : 'Could not accept the request. Try again.')
      setRespondingId(null)
    }
  }

  async function handleReject(chatId: string) {
    if (!session) return
    setRequestError(null)
    setRespondingId(chatId)
    try {
      await apiFetch(`/chat/${chatId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      })
      setPendingRequests((current) => current.filter((request) => request.chatId !== chatId))
    } catch (err) {
      setRequestError(err instanceof ApiError ? err.message : 'Could not reject the request. Try again.')
    } finally {
      setRespondingId(null)
    }
  }

  function handleNavTab(tab: BottomNavTab) {
    if (tab === 'settings') navigate('/settings')
    // "home" y "chats" son la misma pantalla hoy: la lista de chats ya vive acá.
  }

  async function handleEndSession() {
    // Navegar primero: si limpiamos la sesión antes, RequireSession redirige /home a "/"
    // en cuanto session pasa a null, y gana la carrera contra este navigate a /session-end.
    navigate('/session-end')
    await endSession()
  }

  // RequireSession ya garantiza que hay sesión al llegar acá; este guard es solo para el
  // instante entre endSession() vaciando el estado y la navegación a /session-end.
  if (!session) return null

  return (
    <div className={styles.root}>
      <div className={styles.brandHeader}>
        <img src="/wisp-icon.png" alt="" className={styles.logo} />
        <span className={styles.brandName}>Wisp</span>
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <p className={styles.label}>Your ID</p>
          <SessionIdDisplay id={session.id} onRefresh={refreshSession} isRefreshing={isRefreshing} />
          <Button variant="ghost" onClick={handleEndSession} className={styles.endSession}>
            End session
          </Button>
        </header>

        {error && <p className={styles.error}>{error}</p>}

        <p className={styles.expiration}>Active — this ID disappears when you close this tab</p>

        <div className={styles.divider} aria-hidden="true" />

        <div className={styles.chatsSection}>
          <div className={styles.chatsHeader}>
            <h2 className={styles.chatsTitle}>Chats</h2>
            <Button onClick={() => navigate('/new-chat')}>New chat</Button>
          </div>

          {requestError && <p className={styles.error}>{requestError}</p>}

          {pendingRequests.length > 0 && (
            <div className={styles.requests}>
              {pendingRequests.map((request) => (
                <ChatRequestCard
                  key={request.chatId}
                  fromId={request.fromId}
                  onAccept={() => handleAccept(request.chatId, request.fromId)}
                  onReject={() => handleReject(request.chatId)}
                  isResponding={respondingId === request.chatId}
                />
              ))}
            </div>
          )}

          {chats.length > 0 ? (
            <div className={styles.chatList}>
              {chats.map((chat) => (
                <ChatListItem
                  key={chat.chatId}
                  recipientId={chat.recipientId}
                  online={chat.recipientOnline}
                  preview={describeLastMessage(chat.lastMessage)}
                  timestamp={chat.lastMessage?.createdAt}
                  unreadCount={chat.unreadCount}
                  onClick={() => navigate(`/chat/${chat.chatId}`, { state: { recipientId: chat.recipientId } })}
                />
              ))}
            </div>
          ) : (
            pendingRequests.length === 0 && (
              <Card className={styles.emptyState}>
                <p>No active chats yet.</p>
                <p className={styles.emptyStateHint}>Start a new chat to see it here.</p>
              </Card>
            )
          )}
        </div>
      </div>

      <BottomNav active="home" onChange={handleNavTab} />
    </div>
  )
}
