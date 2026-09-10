import { StatusDot } from '@/shared/StatusDot/StatusDot'
import { Badge } from '@/shared/Badge/Badge'
import { formatRelativeTime } from '@/lib/format'
import styles from './ChatListItem.module.css'

interface ChatListItemProps {
  recipientId: string
  online: boolean
  preview: string
  timestamp?: number
  unreadCount: number
  onClick: () => void
}

// No usa <Card> a propósito, mismo motivo que ChatRequestCard: necesita ser un <button>
// clickeable de punta a punta, no un <div> con algo clickeable adentro.
export function ChatListItem({ recipientId, online, preview, timestamp, unreadCount, onClick }: ChatListItemProps) {
  const hasUnread = unreadCount > 0

  return (
    <button type="button" className={styles.root} onClick={onClick}>
      <div className={styles.topRow}>
        <StatusDot status={online ? 'online' : 'offline'} className={styles.statusDot} />
        <span className={styles.recipientId}>{recipientId}</span>
        {timestamp !== undefined && (
          <span className={styles.time}>{formatRelativeTime(timestamp)}</span>
        )}
      </div>
      <div className={styles.bottomRow}>
        <span className={[styles.preview, hasUnread && styles.previewUnread].filter(Boolean).join(' ')}>
          {preview}
        </span>
        {hasUnread && <Badge className={styles.badge}>{unreadCount}</Badge>}
      </div>
    </button>
  )
}
