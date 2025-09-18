import { readPersistentState, resetPersistentState, writePersistentState } from "./persistent-state"

export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

type AccountState = {
  failures: number
  lockedUntil?: number
}

const ACCOUNT_ATTEMPTS_STORE_KEY = "auth.accountAttempts"

let accountAttemptsStore: Record<string, AccountState> | null = null

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getAccountAttemptsStore() {
  if (!accountAttemptsStore) {
    accountAttemptsStore = readPersistentState<Record<string, AccountState>>(ACCOUNT_ATTEMPTS_STORE_KEY, () => ({}))
  }
  return accountAttemptsStore
}

function persistAccountAttemptsStore() {
  if (accountAttemptsStore) {
    writePersistentState(ACCOUNT_ATTEMPTS_STORE_KEY, accountAttemptsStore)
  }
}

export function resetAuthThrottles() {
  accountAttemptsStore = null
  resetPersistentState(ACCOUNT_ATTEMPTS_STORE_KEY)
}

export function recordSuccessfulLogin(email: string) {
  if (!email) {
    return
  }
  const store = getAccountAttemptsStore()
  const normalized = normalizeEmail(email)
  if (store[normalized]) {
    delete store[normalized]
    persistAccountAttemptsStore()
  }
}

export function checkAccountLock(email: string, now = Date.now()) {
  if (!email) {
    return { locked: false as const }
  }
  const store = getAccountAttemptsStore()
  const state = store[normalizeEmail(email)]
  if (!state) {
    return { locked: false as const }
  }
  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true as const, retryAfterMs: state.lockedUntil - now }
  }
  if (state.lockedUntil && state.lockedUntil <= now) {
    state.lockedUntil = undefined
    state.failures = 0
    persistAccountAttemptsStore()
  }
  return { locked: false as const }
}

export function recordFailedLogin(email: string, now = Date.now()) {
  if (!email) {
    return { locked: false as const, failures: 0 }
  }

  const store = getAccountAttemptsStore()
  const normalized = normalizeEmail(email)
  let state = store[normalized]
  let dirty = false

  if (!state) {
    state = { failures: 0 }
    store[normalized] = state
    dirty = true
  }

  if (state.lockedUntil && state.lockedUntil > now) {
    return { locked: true as const, retryAfterMs: state.lockedUntil - now }
  }
  if (state.lockedUntil && state.lockedUntil <= now) {
    state.lockedUntil = undefined
    state.failures = 0
    dirty = true
  }

  state.failures += 1
  dirty = true

  if (state.failures >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS
    persistAccountAttemptsStore()
    return { locked: true as const, retryAfterMs: LOCKOUT_DURATION_MS }
  }

  if (dirty) {
    persistAccountAttemptsStore()
  }

  return { locked: false as const, failures: state.failures }
}
