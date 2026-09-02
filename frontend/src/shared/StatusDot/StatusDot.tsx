import styles from './StatusDot.module.css'

interface StatusDotProps {
  status: 'online' | 'offline'
  className?: string
}

// Punto de estado — pensado para superponerse sobre un avatar/ícono (borde del color de fondo circundante)
export function StatusDot({ status, className }: StatusDotProps) {
  return <span className={[styles.dot, styles[status], className].filter(Boolean).join(' ')} />
}
