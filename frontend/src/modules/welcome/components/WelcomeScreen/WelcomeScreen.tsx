import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession, SESSION_END_REASON_KEY } from '@/hooks/useSession'
import { Button } from '@/shared/Button/Button'
import { SessionIdDisplay } from '../SessionIdDisplay/SessionIdDisplay'
import styles from './WelcomeScreen.module.css'

export function WelcomeScreen() {
  const { session, isStarting, error, startSession } = useSession()
  const navigate = useNavigate()
  // Si ya había una sesión activa al entrar (sessionStorage), saltar directo a Home.
  // Si se crea recién acá, mostrar el ID antes de continuar.
  const hadSessionAtMount = useRef(session !== null)
  // Se lee una sola vez y se borra: si vinimos acá porque el backend venció la sesión
  // por inactividad, lo decimos explícitamente en vez de un bounce silencioso a Welcome.
  const [showExpiredNotice] = useState(() => {
    const reason = sessionStorage.getItem(SESSION_END_REASON_KEY)
    sessionStorage.removeItem(SESSION_END_REASON_KEY)
    return reason === 'expired'
  })

  useEffect(() => {
    if (hadSessionAtMount.current && session) {
      navigate('/home', { replace: true })
    }
  }, [session, navigate])

  if (session && !hadSessionAtMount.current) {
    return (
      <div className={styles.root}>
        <div className={styles.content}>
          <img src="/wisp-icon.png" alt="" className={styles.icon} />
          <h1 className={styles.title}>You're in</h1>
          <p className={styles.subtitle}>
            This is your temporary ID. Share it with someone to start chatting — it disappears
            when you close this tab.
          </p>
          <SessionIdDisplay id={session.id} />
          <Button onClick={() => navigate('/home')}>Continue</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <img src="/wisp-icon.png" alt="" className={styles.icon} />
        <h1 className={styles.title}>Wisp</h1>
        <p className={styles.subtitle}>
          No account, no email, no phone number. Start a private session to get a temporary ID
          and chat anonymously.
        </p>
        <Button onClick={startSession} disabled={isStarting}>
          {isStarting ? 'Starting…' : 'Start private session'}
        </Button>
        {showExpiredNotice && (
          <p className={styles.notice}>Your previous session expired from inactivity.</p>
        )}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  )
}
