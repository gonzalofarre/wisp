import { Component, type ReactNode } from 'react'
import { Button } from '@/shared/Button/Button'
import styles from './ErrorBoundary.module.css'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

// Red de contención al tope de la app: sin esto, un error de render en cualquier
// pantalla deja la app entera en blanco sin explicación (silencioso, justo lo que el
// spec pide evitar). Solo React lo detecta con un class component — no hay equivalente
// con hooks todavía.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown): void {
    console.error('[ErrorBoundary] unexpected render error', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.root}>
          <div className={styles.content}>
            <h1 className={styles.title}>Something went wrong</h1>
            <p className={styles.subtitle}>
              An unexpected error occurred. Your identity and chats are still private — reloading
              should fix it.
            </p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
