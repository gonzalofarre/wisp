export type MessageKind = 'text' | 'image' | 'video' | 'audio' | 'document'

export interface MessageMedia {
  id: string
  mimeType: string
  fileName: string
  size: number
}

export type MediaStatus = 'viewed' | 'deleted'

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  kind: MessageKind
  text?: string
  media?: MessageMedia
  mediaStatus?: MediaStatus
  createdAt: number
  expiresAt: number
}
