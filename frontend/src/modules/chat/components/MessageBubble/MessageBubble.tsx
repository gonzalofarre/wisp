import { FileText } from 'lucide-react'
import type { ChatMessage } from '../../types'
import { useMediaUrl } from '../../hooks/useMediaUrl'
import { formatFileSize, formatMessageTime } from '@/lib/format'
import styles from './MessageBubble.module.css'

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
}

function MediaContent({ message }: { message: ChatMessage }) {
  const media = message.media
  const { url, error } = useMediaUrl(media?.id ?? '')

  if (!media) return null
  if (error) return <p className={styles.mediaError}>{error}</p>
  if (!url) return <p className={styles.mediaLoading}>Loading attachment…</p>

  if (message.kind === 'image') {
    return <img src={url} alt={media.fileName} className={styles.image} />
  }

  if (message.kind === 'video') {
    // eslint-disable-next-line jsx-a11y/media-has-caption -- adjunto de usuario, sin subtítulos disponibles
    return <video src={url} controls className={styles.video} />
  }

  if (message.kind === 'audio') {
    return <audio src={url} controls className={styles.audio} />
  }

  return (
    <a href={url} download={media.fileName} className={styles.document}>
      <FileText size={20} />
      <span className={styles.documentName}>{media.fileName}</span>
      <span className={styles.documentSize}>{formatFileSize(media.size)}</span>
    </a>
  )
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={[styles.root, isOwn ? styles.own : styles.other].filter(Boolean).join(' ')}>
      {message.kind === 'text' ? (
        <p className={styles.text}>{message.text}</p>
      ) : (
        <MediaContent message={message} />
      )}
      <span className={styles.time}>{formatMessageTime(message.createdAt)}</span>
    </div>
  )
}
