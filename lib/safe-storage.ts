import { readPersistentState, writePersistentState } from "./persistent-state"

interface SafeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

const SERVER_STORE_KEY = "app.serverStorage"

type ServerStore = Record<string, string>

let serverStoreCache: ServerStore | null = null

function getServerStore() {
  if (!serverStoreCache) {
    serverStoreCache = readPersistentState<ServerStore>(SERVER_STORE_KEY, () => ({}))
  }
  return serverStoreCache
}

function persistServerStore() {
  if (serverStoreCache) {
    writePersistentState(SERVER_STORE_KEY, serverStoreCache)
  }
}

const createSafeStorage = (): SafeStorage => {
  if (typeof window === "undefined") {
    // Server-side: persist using the shared JSON store
    return {
      getItem: (key: string) => {
        const store = getServerStore()
        return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
      },
      setItem: (key: string, value: string) => {
        const store = getServerStore()
        if (store[key] === value) {
          return
        }
        store[key] = value
        persistServerStore()
      },
      removeItem: (key: string) => {
        const store = getServerStore()
        if (!Object.prototype.hasOwnProperty.call(store, key)) {
          return
        }
        delete store[key]
        persistServerStore()
      },
    }
  }

  // Client-side: return actual localStorage
  return {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
    removeItem: (key: string) => localStorage.removeItem(key),
  }
}

export const safeStorage = createSafeStorage()

// Helper for session storage
const createSafeSessionStorage = (): SafeStorage => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  }

  return {
    getItem: (key: string) => sessionStorage.getItem(key),
    setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
    removeItem: (key: string) => sessionStorage.removeItem(key),
  }
}

export const safeSessionStorage = createSafeSessionStorage()
