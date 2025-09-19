import type { SafeStorage } from "./safe-storage.types"

let safeStorageImpl: SafeStorage
let safeSessionStorageImpl: SafeStorage

if (typeof window === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { serverSafeStorage, serverSafeSessionStorage } = require("./safe-storage.server") as typeof import("./safe-storage.server")
  safeStorageImpl = serverSafeStorage
  safeSessionStorageImpl = serverSafeSessionStorage
} else {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { clientSafeStorage, clientSafeSessionStorage } = require("./safe-storage.client") as typeof import("./safe-storage.client")
  safeStorageImpl = clientSafeStorage
  safeSessionStorageImpl = clientSafeSessionStorage
}

export const safeStorage = safeStorageImpl
export const safeSessionStorage = safeSessionStorageImpl

export type { SafeStorage }
