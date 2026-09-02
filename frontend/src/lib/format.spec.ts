import { describe, it, expect } from 'vitest'
import { formatRecipientId, cleanRecipientIdChars, formatFileSize, formatMessageTime } from './format'

describe('cleanRecipientIdChars', () => {
  it('uppercases and strips non-alphanumeric characters without adding a dash', () => {
    expect(cleanRecipientIdChars('7k3m-q9l2')).toBe('7K3MQ9L2')
  })

  it('caps at 8 characters', () => {
    expect(cleanRecipientIdChars('7K3MQ9L2EXTRA')).toBe('7K3MQ9L2')
  })
})

describe('formatRecipientId', () => {
  it('inserts a dash after the 4th character', () => {
    expect(formatRecipientId('7K3MQ9L2')).toBe('7K3M-Q9L2')
  })

  it('uppercases lowercase input', () => {
    expect(formatRecipientId('7k3mq9l2')).toBe('7K3M-Q9L2')
  })

  it('strips spaces and other non-alphanumeric characters', () => {
    expect(formatRecipientId('7k3m q9l2')).toBe('7K3M-Q9L2')
    expect(formatRecipientId('7k3m-q9l2')).toBe('7K3M-Q9L2')
  })

  it('does not add a dash before 5 characters', () => {
    expect(formatRecipientId('7K3')).toBe('7K3')
    expect(formatRecipientId('7K3M')).toBe('7K3M')
  })

  it('caps the result at 8 characters plus the dash', () => {
    expect(formatRecipientId('7K3MQ9L2EXTRA')).toBe('7K3M-Q9L2')
  })
})

describe('formatFileSize', () => {
  it('formats bytes under 1KB as B', () => {
    expect(formatFileSize(512)).toBe('512 B')
  })

  it('formats kilobytes with no decimals', () => {
    expect(formatFileSize(2048)).toBe('2 KB')
  })

  it('formats megabytes with one decimal', () => {
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB')
  })
})

describe('formatMessageTime', () => {
  it('renders an hour:minute string', () => {
    const timestamp = new Date('2026-01-01T15:30:00').getTime()
    expect(formatMessageTime(timestamp)).toMatch(/\d{1,2}:\d{2}/)
  })
})
