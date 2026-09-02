import { useState, type FormEvent } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { Input } from '@/shared/Input/Input'
import { IconButton } from '@/shared/IconButton/IconButton'
import { AttachMenu } from '../AttachMenu/AttachMenu'
import styles from './MessageInput.module.css'

interface MessageInputProps {
  onSend: (text: string) => void
  onAttach: (file: File) => void
  disabled?: boolean
}

export function MessageInput({ onSend, onAttach, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const [showAttachMenu, setShowAttachMenu] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  function handleFileSelected(file: File) {
    setShowAttachMenu(false)
    onAttach(file)
  }

  return (
    <form className={styles.root} onSubmit={handleSubmit}>
      {showAttachMenu && (
        <AttachMenu onSelect={handleFileSelected} onClose={() => setShowAttachMenu(false)} />
      )}
      <IconButton
        type="button"
        aria-label="Attach"
        disabled={disabled}
        onClick={() => setShowAttachMenu((current) => !current)}
      >
        <Paperclip size={18} />
      </IconButton>
      <Input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Message"
        aria-label="Message"
        autoComplete="off"
        disabled={disabled}
      />
      <IconButton type="submit" aria-label="Send" disabled={disabled || !text.trim()}>
        <Send size={18} />
      </IconButton>
    </form>
  )
}
