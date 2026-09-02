import { Home, MessageCircle, Settings } from 'lucide-react'
import styles from './BottomNav.module.css'

export type BottomNavTab = 'home' | 'chats' | 'settings'

interface BottomNavProps {
  active: BottomNavTab
  onChange: (tab: BottomNavTab) => void
}

const TABS: { id: BottomNavTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'chats', label: 'Chats', icon: MessageCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
]

// Presentacional y agnóstico de router — la pantalla que lo use decide cómo navegar en onChange
export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className={styles.nav}>
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={[styles.tab, active === id && styles.active].filter(Boolean).join(' ')}
          onClick={() => onChange(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={22} strokeWidth={active === id ? 2.25 : 1.75} />
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  )
}
