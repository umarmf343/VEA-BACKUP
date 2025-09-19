interface SafeStorage {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

type ServerStore = Record<string, string>

const GLOBAL_STORE_KEY = "__vea_server_storage__" as const

type GlobalWithServerStore = typeof globalThis & {
  [GLOBAL_STORE_KEY]?: ServerStore
}

let serverStoreCache: ServerStore | null = null

function getServerStore() {
  if (typeof window !== "undefined") {
    throw new Error("Server store is not available in the browser")
  }

  if (!serverStoreCache) {
    const globalRef = globalThis as GlobalWithServerStore
    if (!globalRef[GLOBAL_STORE_KEY]) {
      globalRef[GLOBAL_STORE_KEY] = {}
    }
    serverStoreCache = globalRef[GLOBAL_STORE_KEY]!
  }

  return serverStoreCache
}

const createSafeStorage = (): SafeStorage => {
  if (typeof window === "undefined") {
    // Server-side: persist using a shared in-memory store scoped to the Node process
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
      },
      removeItem: (key: string) => {
        const store = getServerStore()
        if (!Object.prototype.hasOwnProperty.call(store, key)) {
          return
        }
        delete store[key]
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
