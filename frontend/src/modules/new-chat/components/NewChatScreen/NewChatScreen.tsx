import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { apiFetch, ApiError } from '@/lib/api'
import { formatRecipientId } from '@/lib/format'
import { Button } from '@/shared/Button/Button'
import { IconButton } from '@/shared/IconButton/IconButton'
import { RecipientIdInput, RECIPIENT_ID_LENGTH } from '../RecipientIdInput/RecipientIdInput'
import styles from './NewChatScreen.module.css'

interface CreateChatResponse {
  chatId: string
  recipientId: string
}

export function NewChatScreen() {
  const { session } = useSession()
  const navigate = useNavigate()
  const [recipientId, setRecipientId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isComplete = recipientId.length === RECIPIENT_ID_LENGTH

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!session || !isComplete || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    try {
      const chat = await apiFetch<CreateChatResponse>('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        // El input maneja el ID como 8 caracteres sin guión; el guión que ve el
        // usuario es solo un separador visual fijo entre los dos grupos.
        body: JSON.stringify({ recipientId: formatRecipientId(recipientId) }),
      })
      navigate(`/chat/${chat.chatId}`, { state: { recipientId: chat.recipientId } })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the chat. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <IconButton aria-label="Back" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className={styles.title}>New chat</h1>
      </header>

      <form className={styles.content} onSubmit={handleSubmit}>
        <div className={styles.card}>
          <p className={styles.subtitle}>
            Enter the ID someone shared with you to connect. There's no search or contact list —
            you need the exact ID.
          </p>

          <RecipientIdInput value={recipientId} onChange={setRecipientId} autoFocus />

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" disabled={!isComplete || isSubmitting}>
            {isSubmitting ? 'Connecting…' : 'Start chat'}
          </Button>
        </div>
      </form>
    </div>
  )
}
