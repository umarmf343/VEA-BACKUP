import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { rateLimit } from "express-rate-limit"
import crypto from "crypto"

// Password hashing utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

// JWT utilities
export const generateToken = (payload: any): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "24h" })
}

export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!)
  } catch (error) {
    throw new Error("Invalid token")
  }
}

// Rate limiting configuration
export const createRateLimit = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  })
}

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
}

// Role-based access control
export const hasPermission = (userRole: string, requiredRoles: string[]): boolean => {
  const roleHierarchy = {
    "Super Admin": 7,
    Admin: 6,
    Teacher: 5,
    Accountant: 4,
    Librarian: 3,
    Parent: 2,
    Student: 1,
  }

  const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
  const requiredLevel = Math.max(...requiredRoles.map((role) => roleHierarchy[role as keyof typeof roleHierarchy] || 0))

  return userLevel >= requiredLevel
}

// Data encryption utilities
const ENCRYPTION_SALT = "vea-security-salt"
const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEYLEN = 32
const PBKDF2_DIGEST = "sha256"
const AES_ADDITIONAL_DATA = "additional-data"
const AES_IV_LENGTH = 16
const AES_TAG_LENGTH = 16 // bytes

const ensureEncryptionKey = (): string => {
  const key = process.env.ENCRYPTION_KEY

  if (!key || key.trim().length === 0) {
    throw new Error("ENCRYPTION_KEY must be set to encrypt sensitive data")
  }

  if (key.trim().length < 16) {
    throw new Error("ENCRYPTION_KEY must be at least 16 characters long")
  }

  return key
}

const toHex = (bytes: ArrayLike<number>): string => {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

const hexToUint8Array = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0) {
    throw new Error("Invalid hex value provided")
  }

  const array = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    array[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }

  return array
}

const deriveServerKey = (): Buffer => {
  const key = ensureEncryptionKey()
  return crypto.pbkdf2Sync(key, ENCRYPTION_SALT, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
}

const deriveBrowserKey = async (): Promise<CryptoKey> => {
  if (typeof window === "undefined") {
    throw new Error("Web Crypto API is only available in the browser")
  }

  const browserCrypto = window.crypto
  if (!browserCrypto || !browserCrypto.subtle) {
    throw new Error("Web Crypto API is not available in this environment")
  }

  const encoder = new TextEncoder()
  const keyMaterial = await browserCrypto.subtle.importKey(
    "raw",
    encoder.encode(ensureEncryptionKey()),
    "PBKDF2",
    false,
    ["deriveKey"]
  )

  return browserCrypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(ENCRYPTION_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  )
}

export const encryptSensitiveData = async (data: string): Promise<string> => {
  if (typeof window !== "undefined") {
    try {
      const browserCrypto = window.crypto
      if (!browserCrypto || !browserCrypto.subtle) {
        throw new Error("Web Crypto API is not available in this environment")
      }

      const encoder = new TextEncoder()
      const key = await deriveBrowserKey()
      const iv = browserCrypto.getRandomValues(new Uint8Array(AES_IV_LENGTH))

      const encryptedBuffer = await browserCrypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: encoder.encode(AES_ADDITIONAL_DATA),
          tagLength: AES_TAG_LENGTH * 8,
        },
        key,
        encoder.encode(data)
      )

      const encryptedBytes = new Uint8Array(encryptedBuffer)
      const cipherBytes = encryptedBytes.slice(0, encryptedBytes.length - AES_TAG_LENGTH)
      const authTagBytes = encryptedBytes.slice(encryptedBytes.length - AES_TAG_LENGTH)

      return `${toHex(iv)}:${toHex(authTagBytes)}:${toHex(cipherBytes)}`
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to encrypt data in browser: ${message}`)
    }
  }

  try {
    const keyBuffer = deriveServerKey()
    const iv = crypto.randomBytes(AES_IV_LENGTH)
    const cipher = crypto.createCipheriv("aes-256-gcm", keyBuffer, iv)
    cipher.setAAD(Buffer.from(AES_ADDITIONAL_DATA))

    const encryptedBuffer = Buffer.concat([cipher.update(data, "utf8"), cipher.final()])
    const authTag = cipher.getAuthTag()

    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encryptedBuffer.toString("hex")}`
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to encrypt data on server: ${message}`)
  }
}

export const decryptSensitiveData = async (encryptedData: string): Promise<string> => {
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(":")
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted data format")
  }

  if (typeof window !== "undefined") {
    try {
      const browserCrypto = window.crypto
      if (!browserCrypto || !browserCrypto.subtle) {
        throw new Error("Web Crypto API is not available in this environment")
      }

      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      const key = await deriveBrowserKey()
      const iv = hexToUint8Array(ivHex)
      const authTag = hexToUint8Array(authTagHex)
      const encryptedBytes = hexToUint8Array(encryptedHex)

      const combined = new Uint8Array(encryptedBytes.length + authTag.length)
      combined.set(encryptedBytes)
      combined.set(authTag, encryptedBytes.length)

      const decryptedBuffer = await browserCrypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv,
          additionalData: encoder.encode(AES_ADDITIONAL_DATA),
          tagLength: AES_TAG_LENGTH * 8,
        },
        key,
        combined
      )

      return decoder.decode(decryptedBuffer)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to decrypt data in browser: ${message}`)
    }
  }

  try {
    const keyBuffer = deriveServerKey()
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")
    const encryptedBuffer = Buffer.from(encryptedHex, "hex")

    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuffer, iv)
    decipher.setAAD(Buffer.from(AES_ADDITIONAL_DATA))
    decipher.setAuthTag(authTag)

    const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()])

    return decryptedBuffer.toString("utf8")
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to decrypt data on server: ${message}`)
  }
}

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 255
}

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const sanitizeSqlInput = (input: string): string => {
  return input.replace(/'/g, "''").replace(/;/g, "").replace(/--/g, "").replace(/\/\*/g, "").replace(/\*\//g, "").trim()
}

export const generateSessionId = (): string => {
  return crypto.randomBytes(32).toString("hex")
}

export const isSessionValid = (sessionData: any): boolean => {
  if (!sessionData || !sessionData.expiresAt) {
    return false
  }

  return new Date(sessionData.expiresAt) > new Date()
}
