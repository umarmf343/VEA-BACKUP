import { rateLimit } from "express-rate-limit"
import crypto from "crypto"

import { authService } from "./auth-service"

// Password hashing utilities
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
export const hashPassword = authService.hashPassword.bind(authService)

export const verifyPassword = authService.verifyPassword.bind(authService)

export const hasPermission = (userRole: string, requiredRoles: string[]): boolean => {
  return authService.hasPermission(userRole, requiredRoles)
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
  const isNodeEnv = typeof process !== "undefined" && !!process.versions?.node

  if (typeof window !== "undefined" && !isNodeEnv) {
    if (!encryptedData.includes(":")) {
      throw new Error("Invalid encrypted data format")
    }

    try {
      return Buffer.from(encryptedData, "base64").toString("utf-8")
    } catch {
      throw new Error("Invalid encrypted data format")
    }
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
