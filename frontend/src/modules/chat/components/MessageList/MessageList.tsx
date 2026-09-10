import { useEffect, useRef, useState } from 'react'
import type { ChatMessage, MediaStatus } from '../../types'
import { MessageBubble } from '../MessageBubble/MessageBubble'
import styles from './MessageList.module.css'

interface MessageListProps {
  messages: ChatMessage[]
  ownId: string
  onMediaStatusChange: (messageId: string, status: MediaStatus) => Promise<string | undefined>
}

const EXPIRY_CHECK_INTERVAL_MS = 5000

export function MessageList({ messages, ownId, onMediaStatusChange }: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null)
  // Los mensajes vencen del lado del servidor por TTL; acá solo reflejamos esa expiración
  // en una vista ya abierta sin esperar a un rejoin — un tick liviano alcanza, no hace
  // falta un evento del servidor por cada mensaje que desaparece.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), EXPIRY_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  const visibleMessages = messages.filter((message) => message.expiresAt > now)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [visibleMessages.length])

  if (visibleMessages.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No messages yet — say hi.</p>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      {visibleMessages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwn={message.senderId === ownId}
          onMediaStatusChange={onMediaStatusChange}
        />
      ))}
      <div ref={endRef} />
    </div>
  )
}
