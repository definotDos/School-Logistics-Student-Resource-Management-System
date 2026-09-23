import { useEffect, useState } from 'react'

const storageKey = 'srmsLoginLockouts'
const readLocks = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
    return Object.fromEntries(Object.entries(stored).filter(([, until]) => Number.isFinite(until) && until > Date.now()))
  } catch { return {} }
}

export function useLoginLockout(email) {
  const [locks, setLocks] = useState(readLocks)
  const [now, setNow] = useState(Date.now)
  const lockedUntil = locks[email.trim().toLowerCase()] || 0

  useEffect(() => {
    const sync = () => { setLocks(readLocks()); setNow(Date.now()) }
    window.addEventListener('storage', sync)
    window.addEventListener('focus', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('focus', sync)
    }
  }, [])

  useEffect(() => {
    if (!lockedUntil) return
    const timer = window.setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= lockedUntil) window.clearInterval(timer)
    }, 250)
    return () => window.clearInterval(timer)
  }, [lockedUntil])

  const recordLock = (accountEmail, error) => {
    if (!error?.lockedUntil || !(error.retryAfterSeconds > 0)) return
    const current = Date.now()
    // Use the server's remaining duration to tolerate different client/server clocks.
    const until = current + error.retryAfterSeconds * 1000
    const next = { ...readLocks(), [accountEmail.trim().toLowerCase()]: until }
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* Server still enforces the lock when storage is unavailable. */ }
    setLocks(next)
    setNow(current)
  }

  return { secondsRemaining: Math.max(0, Math.ceil((lockedUntil - now) / 1000)), hasExpired: lockedUntil > 0 && lockedUntil <= now, recordLock }
}
