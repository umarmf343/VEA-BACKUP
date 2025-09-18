import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "@jest/globals"
import crypto from "crypto"
import { TextDecoder as NodeTextDecoder, TextEncoder as NodeTextEncoder } from "util"
import { decryptSensitiveData, encryptSensitiveData } from "../lib/security"

describe("Server-side sensitive data helpers", () => {
  const globalAny = global as { window?: any }
  let originalWindow: any
  let originalEncryptionKey: string | undefined
  let originalTextEncoder: typeof globalThis.TextEncoder | undefined
  let originalTextDecoder: typeof globalThis.TextDecoder | undefined

  beforeAll(() => {
    originalEncryptionKey = process.env.ENCRYPTION_KEY
    originalTextEncoder = globalAny.TextEncoder
    originalTextDecoder = globalAny.TextDecoder

    if (!globalAny.TextEncoder) {
      globalAny.TextEncoder = NodeTextEncoder as unknown as typeof globalThis.TextEncoder
    }

    if (!globalAny.TextDecoder) {
      globalAny.TextDecoder = NodeTextDecoder as unknown as typeof globalThis.TextDecoder
    }

    process.env.ENCRYPTION_KEY = "test-encryption-key-1234567890"
  })

  afterAll(() => {
    process.env.ENCRYPTION_KEY = originalEncryptionKey

    if (originalTextEncoder === undefined) {
      delete globalAny.TextEncoder
    } else {
      globalAny.TextEncoder = originalTextEncoder
    }

    if (originalTextDecoder === undefined) {
      delete globalAny.TextDecoder
    } else {
      globalAny.TextDecoder = originalTextDecoder
    }
  })

  beforeEach(() => {
    originalWindow = globalAny.window
    delete globalAny.window
  })

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalAny.window
    } else {
      globalAny.window = originalWindow
    }
  })

  it("encrypts data with AES-GCM and restores it on decrypt", async () => {
    const secret = "Highly confidential payload"

    const encrypted = await encryptSensitiveData(secret)

    expect(encrypted).not.toEqual(secret)
    const [ivHex, authTagHex, payloadHex] = encrypted.split(":")
    expect(ivHex).toMatch(/^[0-9a-f]+$/)
    expect(authTagHex).toMatch(/^[0-9a-f]+$/)
    expect(payloadHex).toMatch(/^[0-9a-f]+$/)

    const decrypted = await decryptSensitiveData(encrypted)
    expect(decrypted).toBe(secret)
  })

  it("throws for malformed payloads", async () => {
    await expect(decryptSensitiveData("corrupted")).rejects.toThrowError("Invalid encrypted data format")
  })

  it("uses the Web Crypto API in the browser and interoperates with the server", async () => {
    const secret = "Shared secret"

    globalAny.window = {
      crypto: crypto.webcrypto,
      TextEncoder: globalAny.TextEncoder,
      TextDecoder: globalAny.TextDecoder,
    }
    const subtleEncryptSpy = jest.spyOn(globalAny.window.crypto.subtle, "encrypt")
    const subtleDecryptSpy = jest.spyOn(globalAny.window.crypto.subtle, "decrypt")

    const encrypted = await encryptSensitiveData(secret)
    expect(subtleEncryptSpy).toHaveBeenCalled()
    expect(encrypted).not.toEqual(secret)

    const browserDecrypted = await decryptSensitiveData(encrypted)
    expect(subtleDecryptSpy).toHaveBeenCalled()
    expect(browserDecrypted).toBe(secret)

    delete globalAny.window
    const serverDecrypted = await decryptSensitiveData(encrypted)
    expect(serverDecrypted).toBe(secret)

    subtleEncryptSpy.mockRestore()
    subtleDecryptSpy.mockRestore()
  })
})
