const ID_GROUP_LENGTH = 4
const ID_MAX_LENGTH = ID_GROUP_LENGTH * 2

// Mayúsculas, sin separadores (espacios, guiones, lo que sea) y con tope de 8
// caracteres — la parte que comparten tanto tipear como pegar (a mano o por botón).
export function cleanRecipientIdChars(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ID_MAX_LENGTH)
}

// Con el guión insertado a partir del 5to carácter — coincide con el formato que
// genera el backend (XXXX-XXXX).
export function formatRecipientId(raw: string): string {
  const cleaned = cleanRecipientIdChars(raw)
  if (cleaned.length <= ID_GROUP_LENGTH) return cleaned
  return `${cleaned.slice(0, ID_GROUP_LENGTH)}-${cleaned.slice(ID_GROUP_LENGTH)}`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatMessageTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

// Para el preview de la lista de chats en Home ("2m", "3h") — no hace falta más
// resolución que esa (los mensajes igual vencen a los pocos minutos, ver MESSAGE_TTL_MS).
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const diffSeconds = Math.max(0, Math.floor((now - timestamp) / 1000))
  if (diffSeconds < 60) return 'now'

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes}m`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours}h`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}
