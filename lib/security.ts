import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
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

export type RateLimitResult = {
  success: boolean
  remaining: number
  retryAfter?: number
}

type RateLimitEntry = {
  count: number
  expiresAt: number
}

export type RateLimiter = {
  readonly windowMs: number
  readonly max: number
  attempt: (key: string) => RateLimitResult
  reset: (key?: string) => void
  getState: (key: string) => RateLimitEntry | undefined
}

const now = () => Date.now()

// Rate limiting configuration
export const createRateLimit = (windowMs: number, max: number): RateLimiter => {
  const hits = new Map<string, RateLimitEntry>()

  const cleanupExpired = (key: string) => {
    const entry = hits.get(key)
    if (!entry) {
      return undefined
    }

    const current = now()
    if (entry.expiresAt <= current) {
      hits.delete(key)
      return undefined
    }

    return entry
  }

  return {
    windowMs,
    max,
    attempt: (key: string) => {
      const token = key || "anonymous"
      const current = now()
      const entry = cleanupExpired(token)

      if (!entry) {
        hits.set(token, { count: 1, expiresAt: current + windowMs })
        return {
          success: true,
          remaining: Math.max(0, max - 1),
        }
      }

      if (entry.count >= max) {
        return {
          success: false,
          remaining: 0,
          retryAfter: Math.max(0, entry.expiresAt - current),
        }
      }

      entry.count += 1
      hits.set(token, entry)

      return {
        success: true,
        remaining: Math.max(0, max - entry.count),
        retryAfter: entry.expiresAt - current,
      }
    },
    reset: (key?: string) => {
      if (typeof key === "string" && key.length > 0) {
        hits.delete(key)
        return
      }
      hits.clear()
    },
    getState: (key: string) => cleanupExpired(key),
  }
}

export const getClientIp = (
  request: Request | { headers?: Headers | { get: (key: string) => string | null | undefined }; ip?: string; connection?: { remoteAddress?: string } }
) => {
  const anyRequest = request as any
  const directIp: string | undefined = anyRequest?.ip || anyRequest?.connection?.remoteAddress
  const headers: Headers | { get: (key: string) => string | null | undefined } | undefined = anyRequest?.headers

  const fromHeader = (name: string) => {
    if (!headers || typeof headers.get !== "function") {
      return undefined
    }
    const value = headers.get(name)
    return typeof value === "string" ? value.trim() : undefined
  }

  const forwarded = fromHeader("x-forwarded-for")
  const headerIp = forwarded
    ?.split(",")
    .map((part) => part.trim())
    .find((part) => part.length > 0)

  const realIp = fromHeader("x-real-ip")

  return headerIp || realIp || directIp || "unknown"
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
export const encryptSensitiveData = (data: string): string => {
  if (typeof window !== "undefined") {
    // Client-side fallback
    return Buffer.from(data).toString("base64")
  }

  const algorithm = "aes-256-gcm"
  const key = process.env.ENCRYPTION_KEY || "default-key-change-in-production"
  const keyBuffer = crypto.scryptSync(key, "salt", 32)
  const iv = crypto.randomBytes(16)

  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv)
  cipher.setAAD(Buffer.from("additional-data"))

  const encryptedBuffer = Buffer.concat([cipher.update(data, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encryptedBuffer.toString("hex")}`
}

export const decryptSensitiveData = (encryptedData: string): string => {
  if (typeof window !== "undefined") {
    // Client-side fallback
    return Buffer.from(encryptedData, "base64").toString("utf-8")
  }

  const algorithm = "aes-256-gcm"
  const key = process.env.ENCRYPTION_KEY || "default-key-change-in-production"
  const keyBuffer = crypto.scryptSync(key, "salt", 32)

  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(":")
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Invalid encrypted data format")
  }

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const encryptedBuffer = Buffer.from(encryptedHex, "hex")

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv)
  decipher.setAAD(Buffer.from("additional-data"))
  decipher.setAuthTag(authTag)

  const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()])

  return decryptedBuffer.toString("utf8")
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
