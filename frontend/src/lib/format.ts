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
