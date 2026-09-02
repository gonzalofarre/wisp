import { Outlet } from 'react-router-dom'
import styles from './AppShell.module.css'

// Mobile sigue siendo un solo panel a pantalla completa (sin cambios). A partir de md
// se suma un panel izquierdo fijo con la marca, y el contenido pasa a vivir en el panel
// derecho — cada pantalla ya centra y limita su propio ancho, así que no necesitan saberlo.
export function AppShell() {
  return (
    <div className={styles.root}>
      <aside className={styles.brandPanel}>
        <div className={styles.glow} aria-hidden="true" />
        <img src="/wisp-icon.png" alt="" className={styles.logo} />
        <h1 className={styles.wordmark}>Wisp</h1>
        <p className={styles.tagline}>Anonymous, ephemeral messaging.</p>
      </aside>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
