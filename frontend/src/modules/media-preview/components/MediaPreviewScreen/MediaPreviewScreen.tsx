import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { apiFetch, ApiError } from '@/lib/api'
import { formatFileSize } from '@/lib/format'
import { Button } from '@/shared/Button/Button'
import { IconButton } from '@/shared/IconButton/IconButton'
import { PENDING_MEDIA_STORAGE_KEY, type PendingMedia } from '@/modules/chat/pendingMedia'
import styles from './MediaPreviewScreen.module.css'

interface LocationState {
  file?: File
}

interface UploadResponse {
  mediaId: string
}

export function MediaPreviewScreen() {
  const { chatId } = useParams<{ chatId: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const { session } = useSession()

  const file = (location.state as LocationState | null)?.file
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : undefined), [file])
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  // Sin archivo en el state (link directo, recarga) no hay nada que previsualizar —
  // volver al chat en vez de mostrar una pantalla vacía.
  useEffect(() => {
    if (!file && chatId) navigate(`/chat/${chatId}`, { replace: true })
  }, [file, chatId, navigate])

  function handleCancel() {
    if (chatId) navigate(`/chat/${chatId}`, { replace: true })
  }

  async function handleSend() {
    if (!file || !chatId || !session || isSending) return

    setIsSending(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploaded = await apiFetch<UploadResponse>('/media', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData,
      })

      const pending: PendingMedia = { chatId, mediaId: uploaded.mediaId }
      sessionStorage.setItem(PENDING_MEDIA_STORAGE_KEY, JSON.stringify(pending))
      navigate(`/chat/${chatId}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload the file. Try again.')
      setIsSending(false)
    }
  }

  if (!file || !previewUrl) return null

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <IconButton aria-label="Cancel" onClick={handleCancel}>
          <ArrowLeft size={20} />
        </IconButton>
        <span className={styles.title}>Preview</span>
      </header>

      <div className={styles.preview}>
        {file.type.startsWith('image/') && <img src={previewUrl} alt={file.name} className={styles.image} />}
        {file.type.startsWith('video/') && (
          // eslint-disable-next-line jsx-a11y/media-has-caption -- preview local, sin subtítulos disponibles
          <video src={previewUrl} controls className={styles.video} />
        )}
        {file.type.startsWith('audio/') && <audio src={previewUrl} controls className={styles.audio} />}
        {!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.type.startsWith('audio/') && (
          <div className={styles.document}>
            <FileText size={40} />
            <span className={styles.documentName}>{file.name}</span>
            <span className={styles.documentSize}>{formatFileSize(file.size)}</span>
          </div>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <Button variant="secondary" onClick={handleCancel} disabled={isSending}>
          Cancel
        </Button>
        <Button onClick={handleSend} disabled={isSending}>
          {isSending ? 'Sending…' : 'Send'}
        </Button>
      </div>
    </div>
  )
}
