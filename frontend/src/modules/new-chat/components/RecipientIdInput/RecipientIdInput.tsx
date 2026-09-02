import { useState } from 'react'
import { OTPInput, type SlotProps } from 'input-otp'
import { ClipboardPaste } from 'lucide-react'
import { cleanRecipientIdChars } from '@/lib/format'
import { Button } from '@/shared/Button/Button'
import styles from './RecipientIdInput.module.css'

export const RECIPIENT_ID_LENGTH = 8
const ID_GROUP_LENGTH = 4

// Mismo charset que ID_CHARSET en session.service.ts (backend) — sin 0/O/1/I/L. Se
// acepta mayúscula y minúscula porque el usuario puede tipear en cualquiera; onChange
// normaliza a mayúscula antes de guardar el estado.
const ID_PATTERN = '^[23456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz]+$'

interface RecipientIdInputProps {
  value: string
  onChange: (value: string) => void
  autoFocus?: boolean
}

// Casilleros estilo OTP en vez de un input de texto plano: el guión central es un
// elemento fijo de la UI (no algo que el usuario tenga que tipear), y pegar un código
// completo (con o sin guión) lo reparte solo entre los casilleros. El botón "Paste" es
// un atajo explícito para quien no piensa en pegar directo sobre los casilleros (o en
// mobile, donde Cmd/Ctrl+V no existe).
export function RecipientIdInput({ value, onChange, autoFocus }: RecipientIdInputProps) {
  const [pasteError, setPasteError] = useState<string | null>(null)

  async function handlePasteButton() {
    setPasteError(null)
    try {
      const text = await navigator.clipboard.readText()
      onChange(cleanRecipientIdChars(text))
    } catch {
      setPasteError("Couldn't read the clipboard — paste it manually instead.")
    }
  }

  return (
    <div className={styles.root}>
      <OTPInput
        value={value}
        onChange={(next) => onChange(next.toUpperCase())}
        maxLength={RECIPIENT_ID_LENGTH}
        pattern={ID_PATTERN}
        placeholder="7K3MQ9L2"
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label="Recipient ID"
        containerClassName={styles.container}
        pasteTransformer={cleanRecipientIdChars}
        render={({ slots }) => (
          <div className={styles.slots}>
            {slots.slice(0, ID_GROUP_LENGTH).map((slot, index) => (
              <Slot key={index} {...slot} />
            ))}
            <span className={styles.separator}>-</span>
            {slots.slice(ID_GROUP_LENGTH).map((slot, index) => (
              <Slot key={index + ID_GROUP_LENGTH} {...slot} />
            ))}
          </div>
        )}
      />

      <div className={styles.pasteRow}>
        <Button type="button" variant="ghost" className={styles.pasteButton} onClick={handlePasteButton}>
          <ClipboardPaste size={16} />
          Paste
        </Button>
      </div>

      {pasteError && <p className={styles.pasteError}>{pasteError}</p>}
    </div>
  )
}

function Slot({ char, placeholderChar, isActive, hasFakeCaret }: SlotProps) {
  return (
    <div className={[styles.slot, isActive && styles.slotActive].filter(Boolean).join(' ')}>
      {char ?? <span className={styles.placeholder}>{placeholderChar}</span>}
      {hasFakeCaret && <span className={styles.caret} />}
    </div>
  )
}
