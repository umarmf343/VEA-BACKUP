export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

type AccountState = {
  failures: number
  lockedUntil?: number
}

const accountAttempts = new Map<string, AccountState>()

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function resolveState(email: string): AccountState {
  const normalized = normalizeEmail(email)
  const existing = accountAttempts.get(normalized)
  if (existing) {
    return existing
  }
  const next: AccountState = { failures: 0 }
  accountAttempts.set(normalized, next)
  return next
}

export function resetAuthThrottles() {
  accountAttempts.clear()
}

export function recordSuccessfulLogin(email: string) {
  accountAttempts.delete(normalizeEmail(email))
}

export function checkAccountLock(email: string, now = Date.now()) {
  if (!email) {
    return { locked: false as const }
  }
  const state = accountAttempts.get(normalizeEmail(email))
  if (!state) {
    return { locked: false as const }
  }
  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true as const, retryAfterMs: state.lockedUntil - now }
  }
  if (state.lockedUntil && state.lockedUntil <= now) {
    state.lockedUntil = undefined
    state.failures = 0
  }
  return { locked: false as const }
}

export function recordFailedLogin(email: string, now = Date.now()) {
  if (!email) {
    return { locked: false as const, failures: 0 }
  }
  const state = resolveState(email)

  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true as const, retryAfterMs: state.lockedUntil - now }
  }
  if (state.lockedUntil && state.lockedUntil <= now) {
    state.lockedUntil = undefined
    state.failures = 0
  }

  state.failures += 1

  if (state.failures >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS
    return { locked: true as const, retryAfterMs: LOCKOUT_DURATION_MS }
  }

  return { locked: false as const, failures: state.failures }
}
