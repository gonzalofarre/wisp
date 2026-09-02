import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

// Reutilizable: envuelve /home, /new-chat y /chat
export function RequireSession({ children }: { children: ReactNode }) {
  const { session } = useSession()
  return session ? <>{children}</> : <Navigate to="/" replace />
}
