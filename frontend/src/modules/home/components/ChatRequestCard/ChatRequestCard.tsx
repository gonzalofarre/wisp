import { Check, X } from 'lucide-react'
import styles from './ChatRequestCard.module.css'

interface ChatRequestCardProps {
  fromId: string
  onAccept: () => void
  onReject: () => void
  isResponding?: boolean
}

// No usa el <Card> compartido a propósito: el borde-gradiente necesita controlar
// border/background/padding sin pelearse con los estilos base de Card en el cascade.
export function ChatRequestCard({ fromId, onAccept, onReject, isResponding }: ChatRequestCardProps) {
  return (
    <div className={styles.root}>
      <p className={styles.message}>
        <span className={styles.fromId}>{fromId}</span> wants to connect with you
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.reject}
          onClick={onReject}
          disabled={isResponding}
          aria-label={`Reject ${fromId}`}
        >
          <X size={22} />
        </button>
        <button
          type="button"
          className={styles.accept}
          onClick={onAccept}
          disabled={isResponding}
          aria-label={`Accept ${fromId}`}
        >
          <Check size={22} />
        </button>
      </div>
    </div>
  )
}
