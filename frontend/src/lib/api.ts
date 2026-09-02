const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

// Emitido en window (no en un event bus propio) para que cualquier parte de la app pueda
// reaccionar sin depender de quién hizo el fetch — hoy lo escucha SessionProvider, y el
// socket dispara el mismo evento ante 'session:expired' del servidor.
export const SESSION_EXPIRED_EVENT = 'wisp:session-expired'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const HTTP_UNAUTHORIZED = 401

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, init)

  if (!response.ok) {
    if (response.status === HTTP_UNAUTHORIZED) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT))
    }
    throw new ApiError(response.status, await extractErrorMessage(response))
  }

  if (response.status === HTTP_NO_CONTENT) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

// Nest devuelve { message } en el body de sus excepciones — lo usamos si está para mostrar
// un error específico (ej. "Recipient ID not found") en vez de uno genérico por status code.
async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
      return body.message
    }
  } catch {
    // body no era JSON — seguimos al mensaje genérico
  }
  return `Request failed with status ${response.status}`
}

const HTTP_NO_CONTENT = 204
