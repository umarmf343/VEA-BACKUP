import { readPersistentState, resetPersistentState, writePersistentState } from "@/lib/persistent-state"

export type VerifyRateEntry = {
  count: number
  firstRequestAt: number
}

const RATE_LIMIT_STORE_KEY = "payments.verify.rateLimit"

let verifyRateState: Record<string, VerifyRateEntry> | null = null

function getVerifyRateState() {
  if (!verifyRateState) {
    verifyRateState = readPersistentState<Record<string, VerifyRateEntry>>(RATE_LIMIT_STORE_KEY, () => ({}))
  }
  return verifyRateState
}

function persistVerifyRateState() {
  if (verifyRateState) {
    writePersistentState(RATE_LIMIT_STORE_KEY, verifyRateState)
  }
}

export const PAYMENT_VERIFY_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 10,
}

export function evaluateVerifyRateLimit(ip: string, now: number) {
  const store = getVerifyRateState()
  const entry = store[ip]
  if (!entry) {
    return { blocked: false as const }
  }
  const elapsed = now - entry.firstRequestAt
  if (elapsed > PAYMENT_VERIFY_RATE_LIMIT.windowMs) {
    delete store[ip]
    persistVerifyRateState()
    return { blocked: false as const }
  }
  if (entry.count >= PAYMENT_VERIFY_RATE_LIMIT.max) {
    return {
      blocked: true as const,
      retryAfterMs: PAYMENT_VERIFY_RATE_LIMIT.windowMs - elapsed,
    }
  }
  return { blocked: false as const }
}

export function registerVerifyAttempt(ip: string, now: number) {
  const store = getVerifyRateState()
  const entry = store[ip]
  if (!entry || now - entry.firstRequestAt > PAYMENT_VERIFY_RATE_LIMIT.windowMs) {
    store[ip] = { count: 1, firstRequestAt: now }
    persistVerifyRateState()
    return
  }
  entry.count += 1
  persistVerifyRateState()
}

export function pruneVerifyRateEntries(now: number) {
  const store = getVerifyRateState()
  let dirty = false
  for (const [ip, entry] of Object.entries(store)) {
    if (now - entry.firstRequestAt > PAYMENT_VERIFY_RATE_LIMIT.windowMs) {
      delete store[ip]
      dirty = true
    }
  }
  if (dirty) {
    persistVerifyRateState()
  }
}

export function resetVerifyRateLimit() {
  verifyRateState = null
  resetPersistentState(RATE_LIMIT_STORE_KEY)
}
