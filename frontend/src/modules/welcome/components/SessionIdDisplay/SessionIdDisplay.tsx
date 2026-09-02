import { useState } from 'react'
import { Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { IconButton } from '@/shared/IconButton/IconButton'
import styles from './SessionIdDisplay.module.css'

interface SessionIdDisplayProps {
  id: string
  // Solo se pasa donde reasignar el ID tiene sentido (Home) — en Welcome ("You're in")
  // no hay conversaciones que se puedan cerrar todavía, así que ahí no se muestra.
  onRefresh?: () => void
  isRefreshing?: boolean
}

const COPIED_FEEDBACK_MS = 1500

export function SessionIdDisplay({ id, onRefresh, isRefreshing }: SessionIdDisplayProps) {
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  async function handleCopy() {
    await navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
  }

  async function handleShare() {
    if (!navigator.share) return
    await navigator.share({ text: id })
  }

  return (
    <div className={styles.root}>
      <span className={styles.id}>{id}</span>
      <div className={styles.actions}>
        <IconButton onClick={handleCopy} aria-label="Copy ID">
          {copied ? <Check size={18} /> : <Copy size={18} />}
        </IconButton>
        {canShare && (
          <IconButton onClick={handleShare} aria-label="Share ID">
            <Share2 size={18} />
          </IconButton>
        )}
        {onRefresh && (
          <IconButton onClick={onRefresh} disabled={isRefreshing} aria-label="Get a new ID">
            <RefreshCw size={18} className={isRefreshing ? styles.spinning : undefined} />
          </IconButton>
        )}
      </div>
    </div>
  )
}
