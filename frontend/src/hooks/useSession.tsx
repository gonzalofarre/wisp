import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { apiFetch, SESSION_EXPIRED_EVENT } from '@/lib/api'

export interface Session {
  id: string
  token: string
}

interface SessionContextValue {
  session: Session | null
  isStarting: boolean
  isRefreshing: boolean
  error: string | null
  startSession: () => Promise<void>
  endSession: () => Promise<void>
  refreshSession: () => Promise<void>
}

const STORAGE_KEY = 'wisp:session'

// Leído por WelcomeScreen al montar, para distinguir "vengo de una sesión que venció"
// de una primera visita — así la expiración es explícita en vez de un bounce silencioso.
export const SESSION_END_REASON_KEY = 'wisp:session-end-reason'

const SessionContext = createContext<SessionContextValue | null>(null)

function readStoredSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

// sessionStorage, no localStorage: cada pestaña tiene su propia identidad temporal y se borra
// sola al cerrar la pestaña — coincide con "el ID es válido solo durante la sesión" del spec,
// y permite abrir dos sesiones distintas en dos pestañas para probar un chat.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readStoredSession())
  const [isStarting, setIsStarting] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  // El backend vence sesiones inactivas por TTL — esto detecta el 401 (de un fetch o del
  // socket) en cualquier parte de la app y cierra la sesión localmente, sin esperar a que
  // el usuario intente otra acción para enterarse.
  useEffect(() => {
    function handleExpired() {
      if (!session) return
      sessionStorage.setItem(SESSION_END_REASON_KEY, 'expired')
      setSession(null)
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired)
  }, [session])

  async function startSession() {
    setIsStarting(true)
    setError(null)
    try {
      const created = await apiFetch<Session>('/session', { method: 'POST' })
      setSession(created)
    } catch {
      setError('Could not start a session. Check your connection and try again.')
    } finally {
      setIsStarting(false)
    }
  }

  async function endSession() {
    if (!session) return
    try {
      await apiFetch('/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.token}` },
      })
    } finally {
      setSession(null)
    }
  }

  // Crea la sesión nueva antes de soltar la vieja: si el paso de borrado de abajo
  // falla, el usuario igual termina con un ID nuevo funcionando (la sesión vieja
  // simplemente queda huérfana hasta que vence sola por TTL — no rompe nada). El ID
  // viejo deja de ser válido apenas se borra, así que cualquier chat que dependía de
  // él queda inaccesible — es la forma en que "reasignar el ID" cierra la conversación
  // activa, sin necesitar lógica aparte para eso.
  async function refreshSession() {
    if (!session || isRefreshing) return

    setIsRefreshing(true)
    setError(null)
    const previousToken = session.token
    try {
      const created = await apiFetch<Session>('/session', { method: 'POST' })
      setSession(created)
      await apiFetch('/session', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${previousToken}` },
      }).catch(() => {})
    } catch {
      setError('Could not refresh your ID. Try again.')
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <SessionContext.Provider
      value={{ session, isStarting, isRefreshing, error, startSession, endSession, refreshSession }}
    >
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
