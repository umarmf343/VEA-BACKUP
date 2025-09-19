import { LOCKOUT_DURATION_MS, MAX_FAILED_ATTEMPTS, resetAuthThrottles } from "@/lib/auth-service"
import { readPersistentState, writePersistentState } from "@/lib/persistent-state"

export type RateEntry = {
  count: number
  firstAttemptAt: number
}

const IP_ATTEMPTS_STORE_KEY = "auth.login.ipAttempts"

let ipAttemptsStore: Record<string, RateEntry> | null = null

function getIpAttemptsStore() {
  if (!ipAttemptsStore) {
    ipAttemptsStore = readPersistentState<Record<string, RateEntry>>(IP_ATTEMPTS_STORE_KEY, () => ({}))
  }
  return ipAttemptsStore
}

function persistIpAttempts() {
  if (ipAttemptsStore) {
    writePersistentState(IP_ATTEMPTS_STORE_KEY, ipAttemptsStore)
  }
}

export const LOGIN_THROTTLE_LIMITS = {
  ip: { windowMs: 10 * 60 * 1000, max: 10 },
  username: { windowMs: LOCKOUT_DURATION_MS, max: MAX_FAILED_ATTEMPTS },
}

export function evaluateIpLimit(ip: string, now: number) {
  const limit = LOGIN_THROTTLE_LIMITS.ip
  const store = getIpAttemptsStore()
  const entry = store[ip]
  if (!entry) {
    return { blocked: false as const }
  }
  const elapsed = now - entry.firstAttemptAt
  if (elapsed > limit.windowMs) {
    delete store[ip]
    persistIpAttempts()
    return { blocked: false as const }
  }
  if (entry.count >= limit.max) {
    return { blocked: true as const, retryAfterMs: limit.windowMs - elapsed }
  }
  return { blocked: false as const }
}

export function registerIpAttempt(ip: string, now: number) {
  const limit = LOGIN_THROTTLE_LIMITS.ip
  const store = getIpAttemptsStore()
  const entry = store[ip]
  if (!entry || now - entry.firstAttemptAt > limit.windowMs) {
    store[ip] = { count: 1, firstAttemptAt: now }
    persistIpAttempts()
    return
  }
  entry.count += 1
  persistIpAttempts()
}

export function clearIpAttempts(ip: string) {
  const store = getIpAttemptsStore()
  if (store[ip]) {
    delete store[ip]
    persistIpAttempts()
  }
}

export function resetLoginThrottling() {
  ipAttemptsStore = {}
  persistIpAttempts()
  ipAttemptsStore = null
  resetAuthThrottles()
}
