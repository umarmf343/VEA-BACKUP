import { afterEach, beforeEach, describe, expect, it } from "@jest/globals"
import { decryptSensitiveData, encryptSensitiveData } from "../lib/security"

describe("Server-side sensitive data helpers", () => {
  const globalAny = global as { window?: any }
  let originalWindow: any

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

  it("encrypts data with AES-GCM and restores it on decrypt", () => {
    const secret = "Highly confidential payload"

    const encrypted = encryptSensitiveData(secret)

    expect(encrypted).not.toEqual(secret)
    const [ivHex, authTagHex, payloadHex] = encrypted.split(":")
    expect(ivHex).toMatch(/^[0-9a-f]+$/)
    expect(authTagHex).toMatch(/^[0-9a-f]+$/)
    expect(payloadHex).toMatch(/^[0-9a-f]+$/)

    const decrypted = decryptSensitiveData(encrypted)
    expect(decrypted).toBe(secret)
  })

  it("decodes legacy base64 payloads without delimiters", () => {
    const legacySecret = "Legacy payload"
    const encoded = Buffer.from(legacySecret, "utf8").toString("base64")

    expect(decryptSensitiveData(encoded)).toBe(legacySecret)
  })

  it("throws for malformed payloads", () => {
    expect(() => decryptSensitiveData("corrupted")).toThrowError("Invalid encrypted data format")
  })
})
