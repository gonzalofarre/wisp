import { useState } from 'react'
import { Download, Eye, FileText, Image as ImageIcon, Music, Trash2, Video } from 'lucide-react'
import type { ChatMessage, MediaStatus } from '../../types'
import { useMediaUrl, fetchMediaBlob } from '../../hooks/useMediaUrl'
import { useSession } from '@/hooks/useSession'
import { Button } from '@/shared/Button/Button'
import { IconButton } from '@/shared/IconButton/IconButton'
import { formatFileSize, formatMessageTime } from '@/lib/format'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  // Solo se usa para media que no es propia (ver ReceivedMediaGate) — un mensaje propio
  // nunca se resuelve a sí mismo, eso lo hace quien lo recibe.
  onMediaStatusChange: (messageId: string, status: MediaStatus) => Promise<string | undefined>
}

const KIND_ICON = { image: ImageIcon, video: Video, audio: Music, document: FileText } as const

function renderMediaElement(kind: ChatMessage['kind'], url: string, fileName: string) {
  if (kind === 'image') return <img src={url} alt={fileName} className={styles.image} />
  if (kind === 'video') {
    // eslint-disable-next-line jsx-a11y/media-has-caption -- adjunto de usuario, sin subtítulos disponibles
    return <video src={url} controls className={styles.video} />
  }
  if (kind === 'audio') return <audio src={url} controls className={styles.audio} />
  return (
    <a href={url} download={fileName} className={styles.document}>
      <FileText size={20} />
      <span className={styles.documentName}>{fileName}</span>
    </a>
  )
}

// Mensajes propios: se cargan solos, como siempre — ya sabés lo que mandaste. Si el
// destinatario después lo abrió o lo descartó, se lo mostramos acá también (mediaStatus
// llega por el mismo broadcast que usa ReceivedMediaGate), sin volver a pedir el archivo:
// para esto ya dejó de existir en el servidor.
function OwnMediaContent({ message }: { message: ChatMessage }) {
  const media = message.media
  const { url, error } = useMediaUrl(message.mediaStatus ? '' : (media?.id ?? ''))

  if (!media) return null

  return (
    <>
      {message.mediaStatus ? null : error ? (
        <p className={styles.mediaError}>{error}</p>
      ) : !url ? (
        <p className={styles.mediaLoading}>Loading attachment…</p>
      ) : (
        renderMediaElement(message.kind, url, media.fileName)
      )}
      {message.mediaStatus && (
        <p className={styles.mediaStatusHint}>{message.mediaStatus === 'viewed' ? 'Viewed' : 'Removed'}</p>
      )}
    </>
  )
}

// Media recibida: no se carga sola. El destinatario elige Ver una vez, Descargar, o
// Borrar — ver CLAUDE.md sección 2.1. "View once" y "Delete" consumen el adjunto en el
// servidor (ver ChatScreen.resolveMediaStatus); "Download" no, se puede seguir viendo
// una vez después de haberlo descargado.
function ReceivedMediaGate({
  message,
  onMediaStatusChange,
}: {
  message: ChatMessage
  onMediaStatusChange: MessageBubbleProps['onMediaStatusChange']
}) {
  const { session } = useSession()
  const media = message.media
  const [viewedUrl, setViewedUrl] = useState<string | undefined>(undefined)
  const [busyAction, setBusyAction] = useState<'view' | 'download' | 'delete' | undefined>(undefined)
  const [actionError, setActionError] = useState<string | undefined>(undefined)

  if (!media) return null

  // Ya resuelto (en este mount, o por el broadcast de un mount anterior) y no hay un
  // blob local que mostrar en su lugar: solo queda el estado final.
  if (message.mediaStatus && !viewedUrl) {
    return <p className={styles.mediaStatusHint}>{message.mediaStatus === 'viewed' ? 'Viewed' : 'Removed'}</p>
  }

  if (viewedUrl) {
    return renderMediaElement(message.kind, viewedUrl, media.fileName)
  }

  async function handleView() {
    if (!session || busyAction) return
    setBusyAction('view')
    setActionError(undefined)
    try {
      const blob = await fetchMediaBlob(media!.id, session.token)
      setViewedUrl(URL.createObjectURL(blob))
      const error = await onMediaStatusChange(message.id, 'viewed')
      if (error) setActionError(error)
    } catch {
      setActionError('Could not load attachment')
    } finally {
      setBusyAction(undefined)
    }
  }

  async function handleDownload() {
    if (!session || busyAction) return
    setBusyAction('download')
    setActionError(undefined)
    try {
      const blob = await fetchMediaBlob(media!.id, session.token)
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = media!.fileName
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      setActionError('Could not download attachment')
    } finally {
      setBusyAction(undefined)
    }
  }

  async function handleDelete() {
    if (busyAction) return
    setBusyAction('delete')
    setActionError(undefined)
    const error = await onMediaStatusChange(message.id, 'deleted')
    if (error) setActionError(error)
    setBusyAction(undefined)
  }

  const Icon = KIND_ICON[message.kind as keyof typeof KIND_ICON] ?? FileText

  return (
    <div className={styles.gate}>
      <div className={styles.gateInfo}>
        <Icon size={18} />
        <div className={styles.gateText}>
          <span className={styles.documentName}>{media.fileName}</span>
          <span className={styles.documentSize}>{formatFileSize(media.size)}</span>
        </div>
      </div>
      <div className={styles.gateActions}>
        <Button variant="secondary" onClick={handleView} disabled={!!busyAction} className={styles.gateViewButton}>
          <Eye size={14} />
          {busyAction === 'view' ? 'Loading…' : 'View once'}
        </Button>
        <IconButton
          aria-label={`Download ${media.fileName}`}
          onClick={handleDownload}
          disabled={!!busyAction}
        >
          <Download size={16} />
        </IconButton>
        <IconButton aria-label={`Delete ${media.fileName}`} onClick={handleDelete} disabled={!!busyAction}>
          <Trash2 size={16} />
        </IconButton>
      </div>
      {actionError && <p className={styles.mediaError}>{actionError}</p>}
    </div>
  )
}

export function MessageBubble({ message, isOwn, onMediaStatusChange }: MessageBubbleProps) {
  return (
    <div className={[styles.root, isOwn ? styles.own : styles.other].filter(Boolean).join(' ')}>
      {message.kind === 'text' ? (
        <p className={styles.text}>{message.text}</p>
      ) : isOwn ? (
        <OwnMediaContent message={message} />
      ) : (
        <ReceivedMediaGate message={message} onMediaStatusChange={onMediaStatusChange} />
      )}
      <span className={styles.time}>{formatMessageTime(message.createdAt)}</span>
    </div>
  )
}
