import { useEffect, useState } from 'react'
import { useSession } from '@/hooks/useSession'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

interface MediaUrlState {
  url?: string
  error?: string
}

// Compartido entre el auto-load de abajo (mensajes propios) y las acciones a demanda de
// un adjunto recibido (View once, Download) — un solo lugar que sabe pedir /media/:id.
export async function fetchMediaBlob(mediaId: string, token: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/media/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Media not found or expired')
  return response.blob()
}

// <img>/<video>/<audio src> no pueden mandar el header Authorization, así que en vez de
// dejar el endpoint de media sin auth, lo pedimos por fetch y armamos un blob: URL local.
export function useMediaUrl(mediaId: string): MediaUrlState {
  const { session } = useSession()
  const [state, setState] = useState<MediaUrlState>({})

  useEffect(() => {
    // mediaId vacío es la señal de "no cargues nada" (media ya resuelta por View
    // once/Delete, ver OwnMediaContent) — sin este guard se dispararía un fetch a
    // /media/ de más en cada mensaje ya consumido.
    if (!session || !mediaId) return

    let cancelled = false
    let objectUrl: string | undefined

    fetchMediaBlob(mediaId, session.token)
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
