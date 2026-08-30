// In-memory rate limiting store for login attempts
interface RateLimitRecord {
  failedAttempts: number
  lockedUntil: number | null
  lastAttemptAt: number
}

const loginRateLimitStore = new Map<string, RateLimitRecord>()

const MAX_FAILED_ATTEMPTS = 4
const LOCKOUT_DURATION_MS = 10 * 60 * 1000 // 10 minutes

function getKey(email: string, ip?: string): string {
  const cleanEmail = email.trim().toLowerCase()
  return cleanEmail ? `user_${cleanEmail}` : `ip_${ip || 'unknown'}`
}

export function checkLoginLockout(email: string, ip?: string): {
  isLocked: boolean
  remainingSeconds: number
  failedAttempts: number
  remainingAttempts: number
} {
  const key = getKey(email, ip)
  const record = loginRateLimitStore.get(key)
  const now = Date.now()

  if (!record) {
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, remainingAttempts: MAX_FAILED_ATTEMPTS }
  }

  // Check if lockout is active
  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000)
    return {
      isLocked: true,
      remainingSeconds,
      failedAttempts: record.failedAttempts,
      remainingAttempts: 0,
    }
  }

  // Lockout expired -> reset
  if (record.lockedUntil && record.lockedUntil <= now) {
    loginRateLimitStore.delete(key)
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, remainingAttempts: MAX_FAILED_ATTEMPTS }
  }

  // If last attempt was more than 15 minutes ago, reset
  if (now - record.lastAttemptAt > 15 * 60 * 1000) {
    loginRateLimitStore.delete(key)
    return { isLocked: false, remainingSeconds: 0, failedAttempts: 0, remainingAttempts: MAX_FAILED_ATTEMPTS }
  }

  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - record.failedAttempts)
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: record.failedAttempts,
    remainingAttempts,
  }
}

export function recordFailedLogin(email: string, ip?: string): {
  isLocked: boolean
  remainingSeconds: number
  failedAttempts: number
  remainingAttempts: number
} {
  const key = getKey(email, ip)
  const now = Date.now()
  const current = loginRateLimitStore.get(key) || { failedAttempts: 0, lockedUntil: null, lastAttemptAt: now }

  current.failedAttempts += 1
  current.lastAttemptAt = now

  if (current.failedAttempts >= MAX_FAILED_ATTEMPTS) {
    current.lockedUntil = now + LOCKOUT_DURATION_MS
    loginRateLimitStore.set(key, current)
    const remainingSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000)
    return {
      isLocked: true,
      remainingSeconds,
      failedAttempts: current.failedAttempts,
      remainingAttempts: 0,
    }
  }

  loginRateLimitStore.set(key, current)
  const remainingAttempts = Math.max(0, MAX_FAILED_ATTEMPTS - current.failedAttempts)
  return {
    isLocked: false,
    remainingSeconds: 0,
    failedAttempts: current.failedAttempts,
    remainingAttempts,
  }
}

export function resetLoginLockout(email: string, ip?: string): void {
  const key = getKey(email, ip)
  loginRateLimitStore.delete(key)
}

export function getAllLockedUsers(): Record<string, { failedAttempts: number; remainingSeconds: number }> {
  const lockedUsers: Record<string, { failedAttempts: number; remainingSeconds: number }> = {}
  const now = Date.now()

  for (const [key, record] of loginRateLimitStore.entries()) {
    if (key.startsWith('user_') && record.lockedUntil && record.lockedUntil > now) {
      const email = key.replace('user_', '')
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000)
      lockedUsers[email] = {
        failedAttempts: record.failedAttempts,
        remainingSeconds,
      }
    }
  }

  return lockedUsers
}
