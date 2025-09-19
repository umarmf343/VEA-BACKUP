import { readPersistentState, resetPersistentState, writePersistentState } from "./persistent-state"

const STORE_KEY = "auth.sessions"

type SessionRecord = {
  userId: string
  expiresAt: number
}

type SessionStore = Record<string, SessionRecord>

let cache: SessionStore | null = null

function getStore() {
  if (!cache) {
    cache = readPersistentState<SessionStore>(STORE_KEY, () => ({}))
  }
  return cache
}

function persist() {
  if (cache) {
    writePersistentState(STORE_KEY, cache)
  }
}

export function saveSession(token: string, record: SessionRecord) {
  const store = getStore()
  store[token] = record
  persist()
}

export function getSessionRecord(token: string) {
  const store = getStore()
  return store[token] ?? null
}

export function deleteSession(token: string) {
  const store = getStore()
  if (store[token]) {
    delete store[token]
    persist()
  }
}

export function sweepExpiredSessions(now = Date.now()) {
  const store = getStore()
  let dirty = false
  for (const [token, record] of Object.entries(store)) {
    if (record.expiresAt <= now) {
      delete store[token]
      dirty = true
    }
  }
  if (dirty) {
    persist()
  }
}

export function resetSessionStore() {
  cache = null
  resetPersistentState(STORE_KEY)
}
