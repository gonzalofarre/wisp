import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

interface MediaUrlState {
  url?: string
  error?: string
}

// <img>/<video>/<audio src> no pueden mandar el header Authorization, así que en vez de
// dejar el endpoint de media sin auth, lo pedimos por fetch y armamos un blob: URL local.
export function useMediaUrl(mediaId: string): MediaUrlState {
  const { session } = useSession()
  const [state, setState] = useState<MediaUrlState>({})

  useEffect(() => {
    if (!session) return

    let cancelled = false
    let objectUrl: string | undefined

    fetch(`${API_BASE_URL}/media/${mediaId}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error('Media not found or expired')
        return response.blob()
      })
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setState({ url: objectUrl })
      })
      .catch(() => {
        if (!cancelled) setState({ error: 'Could not load attachment' })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [mediaId, session])

  return state
}
