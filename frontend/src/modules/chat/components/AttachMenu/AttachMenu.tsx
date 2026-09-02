import { useRef, type ChangeEvent, type ComponentType } from 'react'
import { Camera, FileText, Image, Music, Video, X } from 'lucide-react'
import { IconButton } from '@/shared/IconButton/IconButton'
import styles from './AttachMenu.module.css'

interface AttachMenuProps {
  onSelect: (file: File) => void
  onClose: () => void
}

interface AttachOption {
  label: string
  icon: ComponentType<{ size?: number }>
  accept: string
  capture?: 'environment'
}

const OPTIONS: AttachOption[] = [
  { label: 'Photo', icon: Image, accept: 'image/*' },
  { label: 'Video', icon: Video, accept: 'video/*' },
  { label: 'Audio', icon: Music, accept: 'audio/*' },
  { label: 'Document', icon: FileText, accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip' },
  { label: 'Camera', icon: Camera, accept: 'image/*', capture: 'environment' },
]

export function AttachMenu({ onSelect, onClose }: AttachMenuProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onSelect(file)
    onClose()
  }

  return (
    <>
      <button type="button" className={styles.backdrop} aria-label="Close attach menu" onClick={onClose} />
      <div className={styles.root}>
        <div className={styles.header}>
          <span className={styles.title}>Attach</span>
          <IconButton aria-label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </div>
        <div className={styles.grid}>
          {OPTIONS.map((option, index) => (
            <button
              key={option.label}
              type="button"
              className={styles.option}
              onClick={() => inputRefs.current[index]?.click()}
            >
              <option.icon size={22} />
              <span>{option.label}</span>
              <input
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="file"
                accept={option.accept}
                capture={option.capture}
                className={styles.hiddenInput}
                onChange={handleFileChange}
              />
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
