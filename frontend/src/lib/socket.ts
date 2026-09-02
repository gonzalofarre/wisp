import { io, type Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000'

let socket: Socket | null = null

// Conexión perezosa: se crea recién cuando algo la necesita, no al cargar la app
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false })
  }
  return socket
}
