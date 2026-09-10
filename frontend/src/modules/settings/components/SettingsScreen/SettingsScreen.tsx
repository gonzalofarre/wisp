import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Eraser, HelpCircle, Info, LogOut } from 'lucide-react'
import { useSession } from '@/hooks/useSession'
import { PENDING_MEDIA_STORAGE_KEY } from '@/modules/chat/pendingMedia'
import { Button } from '@/shared/Button/Button'
import { Card } from '@/shared/Card/Card'
import { IconButton } from '@/shared/IconButton/IconButton'
import { BottomNav, type BottomNavTab } from '@/shared/BottomNav/BottomNav'
import styles from './SettingsScreen.module.css'

// Fijo en v1: refleja el default de MESSAGE_TTL_MS en backend/src/modules/chat/chat.service.ts.
// No hay endpoint para configurarlo por sesión todavía, así que mostrarlo como un control
// editable prometería algo que no persiste en ningún lado — se muestra como informativo.
const AUTO_DELETE_LABEL = 'Messages disappear automatically after 5 minutes'

export function SettingsScreen() {
  const navigate = useNavigate()
  const { endSession } = useSession()
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [justCleared, setJustCleared] = useState(false)

  // No hay E2EE real en v1 (ver CLAUDE.md sección 6) — este texto evita cualquier
  // lenguaje de "end-to-end encrypted" a propósito.
  function handleClearData() {
    const confirmed = window.confirm(
      'Clear temporary data cached on this device? This does not end your session.',
    )
    if (!confirmed) return
    sessionStorage.removeItem(PENDING_MEDIA_STORAGE_KEY)
    setJustCleared(true)
  }

  async function handleEraseIdentity() {
    const confirmed = window.confirm(
      'End your session and erase your identity? Your ID stops working immediately and this cannot be undone.',
    )
    if (!confirmed) return
    // Mismo orden que HomeScreen.handleEndSession: navegar primero, porque
    // RequireSession redirige /settings a "/" apenas session pasa a null.
    navigate('/session-end')
    await endSession()
  }

  function handleNavTab(tab: BottomNavTab) {
    if (tab === 'settings') return
    // "Home" y "Chats" comparten la misma pantalla hoy (la lista de chats vive en
    // HomeScreen) — no hay una ruta /chats separada todavía.
    navigate('/home')
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <IconButton aria-label="Back" onClick={() => navigate('/home')}>
          <ArrowLeft size={20} />
        </IconButton>
        <h1 className={styles.title}>Settings</h1>
      </header>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Privacy</h2>

          <Card className={styles.row}>
            <Clock size={18} className={styles.rowIcon} aria-hidden="true" />
            <div className={styles.rowText}>
              <p className={styles.rowLabel}>Auto-delete chats</p>
              <p className={styles.rowHint}>{AUTO_DELETE_LABEL}</p>
            </div>
          </Card>

          <Card className={styles.row}>
            <Eraser size={18} className={styles.rowIcon} aria-hidden="true" />
            <div className={styles.rowText}>
              <p className={styles.rowLabel}>Clear all data</p>
              <p className={styles.rowHint}>Removes temporary data cached on this device.</p>
            </div>
            <Button variant="secondary" onClick={handleClearData} className={styles.rowAction}>
              Clear
            </Button>
          </Card>
          {justCleared && <p className={styles.confirm}>Cleared.</p>}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>About</h2>

          <Card className={styles.disclosureCard}>
            <button
              type="button"
              className={styles.disclosureTrigger}
              onClick={() => setHowItWorksOpen((open) => !open)}
              aria-expanded={howItWorksOpen}
            >
              <HelpCircle size={18} className={styles.rowIcon} aria-hidden="true" />
              <span className={styles.rowLabel}>How it works</span>
            </button>
            {howItWorksOpen && (
              <p className={styles.disclosureBody}>
                Starting a session gives you a random temporary ID — no account, no email, no
                phone number. Share it with someone to start a chat; there&apos;s no search or
                contact list, so only people who have your exact ID can reach you. Messages
                delete themselves automatically, and your ID stops working the moment you end
                the session or close the tab.
              </p>
            )}
          </Card>

          <Card className={styles.row}>
            <Info size={18} className={styles.rowIcon} aria-hidden="true" />
            <div className={styles.rowText}>
              <p className={styles.rowLabel}>About Wisp</p>
              <p className={styles.rowHint}>
                Wisp is private and disappears when you leave — chats aren&apos;t kept beyond
                their expiration window.
              </p>
            </div>
          </Card>
        </section>

        <section className={styles.section}>
          <Button variant="destructive" onClick={handleEraseIdentity} className={styles.eraseButton}>
            <LogOut size={16} />
            Log out &amp; erase identity
          </Button>
        </section>
      </div>

      <BottomNav active="settings" onChange={handleNavTab} />
    </div>
  )
}
