import { forwardRef, type InputHTMLAttributes } from 'react'
import styles from './Input.module.css'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={[styles.input, className].filter(Boolean).join(' ')} {...props} />
  ),
)

Input.displayName = 'Input'
