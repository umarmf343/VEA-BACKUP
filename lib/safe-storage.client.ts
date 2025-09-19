"use client"

import type { SafeStorage } from "./safe-storage.types"

const safeAccess = <T>(fn: () => T): T | null => {
  try {
    return fn()
  } catch (error) {
    console.warn("SafeStorage client access failed", error)
    return null
  }
}

export const clientSafeStorage: SafeStorage = {
  getItem: (key) => safeAccess(() => window.localStorage.getItem(key)) ?? null,
  setItem: (key, value) => {
    safeAccess(() => {
      window.localStorage.setItem(key, value)
    })
  },
  removeItem: (key) => {
    safeAccess(() => {
      window.localStorage.removeItem(key)
    })
  },
}

export const clientSafeSessionStorage: SafeStorage = {
  getItem: (key) => safeAccess(() => window.sessionStorage.getItem(key)) ?? null,
  setItem: (key, value) => {
    safeAccess(() => {
      window.sessionStorage.setItem(key, value)
    })
  },
  removeItem: (key) => {
    safeAccess(() => {
      window.sessionStorage.removeItem(key)
    })
  },
}
