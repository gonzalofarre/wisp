// Handoff entre MediaPreviewScreen y ChatScreen: el archivo sube por REST desde la
// pantalla de preview, pero el mensaje se manda por el socket que vive en ChatScreen (el
// que ya está unido a la room del chat). sessionStorage es más simple que pasar esto por
// el state del router — se limpia explícitamente ni bien se lee, así un reload no reenvía.
export const PENDING_MEDIA_STORAGE_KEY = 'wisp:pending-media'

export interface PendingMedia {
  chatId: string
  mediaId: string
}
