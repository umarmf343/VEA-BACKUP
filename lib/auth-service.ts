type FailureState = {
  count: number
  firstAttemptAt: number
  lockoutUntil?: number
}

const normalize = (identifier: string) => (identifier ?? "").trim().toLowerCase()

const failureStates = new Map<string, FailureState>()

export const MAX_FAILED_ATTEMPTS = 5
export const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000
export const LOCKOUT_DURATION_MS = 5 * 60 * 1000

const now = () => Date.now()

const isStateExpired = (state: FailureState, current: number) => {
  if (state.lockoutUntil && state.lockoutUntil <= current) {
    return true
  }

  if (!state.lockoutUntil && current - state.firstAttemptAt >= FAILED_ATTEMPT_WINDOW_MS) {
    return true
  }

  return false
}

const getActiveState = (key: string, current: number): FailureState | undefined => {
  const existing = failureStates.get(key)
  if (!existing) {
    return undefined
  }

  if (isStateExpired(existing, current)) {
    failureStates.delete(key)
    return undefined
  }

  return existing
}

const ensureStateForFailure = (key: string, current: number): FailureState => {
  const active = getActiveState(key, current)
  if (active) {
    return active
  }

  const next: FailureState = {
    count: 0,
    firstAttemptAt: current,
  }
  failureStates.set(key, next)
  return next
}

export type AttemptAllowance = {
  allowed: boolean
  locked: boolean
  remainingAttempts: number
  retryAfter?: number
}

export const authSecurity = {
  canAttempt(identifier: string): AttemptAllowance {
    const token = normalize(identifier)
    if (!token) {
      return {
        allowed: true,
        locked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
      }
    }

    const current = now()
    const state = getActiveState(token, current)
    if (!state) {
      return {
        allowed: true,
        locked: false,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
      }
    }

    if (state.lockoutUntil && state.lockoutUntil > current) {
      return {
        allowed: false,
        locked: true,
        remainingAttempts: 0,
        retryAfter: state.lockoutUntil - current,
      }
    }

    const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - state.count)

    return {
      allowed: true,
      locked: false,
      remainingAttempts: remaining,
    }
  },

  recordFailedAttempt(identifier: string) {
    const token = normalize(identifier)
    if (!token) {
      return {
        locked: false,
        lockoutUntil: undefined as number | undefined,
        remainingAttempts: MAX_FAILED_ATTEMPTS,
      }
    }

    const current = now()
    const state = ensureStateForFailure(token, current)
    if (state.lockoutUntil && state.lockoutUntil > current) {
      return {
        locked: true,
        lockoutUntil: state.lockoutUntil,
        remainingAttempts: 0,
      }
    }

    state.count += 1

    if (state.count >= MAX_FAILED_ATTEMPTS) {
      state.lockoutUntil = current + LOCKOUT_DURATION_MS
    }

    failureStates.set(token, state)

    const locked = Boolean(state.lockoutUntil && state.lockoutUntil > current)
    const remainingAttempts = locked ? 0 : Math.max(0, MAX_FAILED_ATTEMPTS - state.count)

    return {
      locked,
      lockoutUntil: state.lockoutUntil,
      remainingAttempts,
    }
  },

  resetFailures(identifier: string) {
    const token = normalize(identifier)
    if (!token) {
      return
    }

    failureStates.delete(token)
  },

  resetAll() {
    failureStates.clear()
  },

  getState(identifier: string): FailureState | undefined {
    const token = normalize(identifier)
    if (!token) {
      return undefined
    }
    const current = now()
    return getActiveState(token, current)
  },
}

export type { FailureState }
