import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/Button/Button'
import styles from './SessionEndScreen.module.css'

export function SessionEndScreen() {
  const navigate = useNavigate()

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <img src="/wisp-icon.png" alt="" className={styles.icon} />
        <h1 className={styles.title}>Session ended</h1>
        <p className={styles.subtitle}>
          Your temporary ID has been invalidated. Anyone who had it can no longer reach you with
          it, and your conversations are no longer accessible.
        </p>
        <Button onClick={() => navigate('/')}>Start new session</Button>
      </div>
    </div>
  )
}
