import { readPersistentState, writePersistentState } from "./persistent-state"
import type { SafeStorage } from "./safe-storage.types"

const SERVER_STORE_KEY = "app.serverStorage"

type ServerStore = Record<string, string>

const loadStore = (): ServerStore =>
  readPersistentState<ServerStore>(SERVER_STORE_KEY, () => ({}))

const persistStore = (store: ServerStore) => {
  writePersistentState(SERVER_STORE_KEY, store)
}

export const serverSafeStorage: SafeStorage = {
  getItem: (key) => {
    const store = loadStore()
    return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null
  },
  setItem: (key, value) => {
    const store = { ...loadStore(), [key]: value }
    persistStore(store)
  },
  removeItem: (key) => {
    const store = loadStore()
    if (!Object.prototype.hasOwnProperty.call(store, key)) {
      return
    }
    const { [key]: _removed, ...nextStore } = store
    persistStore(nextStore)
  },
}

export const serverSafeSessionStorage: SafeStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}
