import { readPersistentState, resetPersistentState, writePersistentState } from "@/lib/persistent-state"

export type InitializeRateEntry = {
  count: number
  firstRequestAt: number
}

const RATE_LIMIT_STORE_KEY = "payments.initialize.rateLimit"

let rateState: Record<string, InitializeRateEntry> | null = null

function getRateState() {
  if (!rateState) {
    rateState = readPersistentState<Record<string, InitializeRateEntry>>(RATE_LIMIT_STORE_KEY, () => ({}))
  }
  return rateState
}

function persistRateState() {
  if (rateState) {
    writePersistentState(RATE_LIMIT_STORE_KEY, rateState)
  }
}

export const PAYMENT_INITIALIZE_RATE_LIMIT = {
  windowMs: 60 * 1000,
  max: 5,
}

export function evaluateInitializeRateLimit(ip: string, now: number) {
  const store = getRateState()
  const entry = store[ip]
  if (!entry) {
    return { blocked: false as const }
  }
  const elapsed = now - entry.firstRequestAt
  if (elapsed > PAYMENT_INITIALIZE_RATE_LIMIT.windowMs) {
    delete store[ip]
    persistRateState()
    return { blocked: false as const }
  }
  if (entry.count >= PAYMENT_INITIALIZE_RATE_LIMIT.max) {
    return {
      blocked: true as const,
      retryAfterMs: PAYMENT_INITIALIZE_RATE_LIMIT.windowMs - elapsed,
    }
  }
  return { blocked: false as const }
}

export function registerInitializeAttempt(ip: string, now: number) {
  const store = getRateState()
  const entry = store[ip]
  if (!entry || now - entry.firstRequestAt > PAYMENT_INITIALIZE_RATE_LIMIT.windowMs) {
    store[ip] = { count: 1, firstRequestAt: now }
    persistRateState()
    return
  }
  entry.count += 1
  persistRateState()
}

export function pruneInitializeRateEntries(now: number) {
  const store = getRateState()
  let dirty = false
  for (const [ip, entry] of Object.entries(store)) {
    if (now - entry.firstRequestAt > PAYMENT_INITIALIZE_RATE_LIMIT.windowMs) {
      delete store[ip]
      dirty = true
    }
  }
  if (dirty) {
    persistRateState()
  }
}

export function resetInitializeRateLimit() {
  rateState = null
  resetPersistentState(RATE_LIMIT_STORE_KEY)
}
