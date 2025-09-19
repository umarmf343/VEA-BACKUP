import { readPersistentState, resetPersistentState, writePersistentState } from "./persistent-state"

const STORE_KEY = "auth.sessions"

type SessionRecord = {
  userId: string
  expiresAt: number
}

type SessionStore = Record<string, SessionRecord>

const loadSessions = (): SessionStore =>
  readPersistentState<SessionStore>(STORE_KEY, () => ({}))

const persistSessions = (store: SessionStore) => {
  writePersistentState(STORE_KEY, store)
}

export function saveSession(token: string, record: SessionRecord) {
  const store = { ...loadSessions(), [token]: record }
  persistSessions(store)
}

export function getSessionRecord(token: string) {
  const store = loadSessions()
  return store[token] ?? null
}

export function deleteSession(token: string) {
  const store = loadSessions()
  if (!store[token]) {
    return
  }
  const { [token]: _removed, ...nextStore } = store
  persistSessions(nextStore)
}

export function sweepExpiredSessions(now = Date.now()) {
  const store = loadSessions()
  const nextStore: SessionStore = {}
  let dirty = false

  for (const [token, record] of Object.entries(store)) {
    if (record.expiresAt > now) {
      nextStore[token] = record
      continue
    }
    dirty = true
  }

  if (dirty) {
    persistSessions(nextStore)
  }
}

export function resetSessionStore() {
  resetPersistentState(STORE_KEY)
}
