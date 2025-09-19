import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken"

import { verifyPassword as verifyPasswordWithScrypt } from "./auth"

const DEFAULT_JWT_TTL = "24h"

const DEV_FALLBACK_SECRET = "development-secret-change-me-please-0123456789"
const TEST_FALLBACK_SECRET = "test-secret-change-me-please-0123456789"

let runtimeSecret: string | null = null

type Primitive = string | number | boolean | null | undefined

type TokenPayload = {
  userId?: string
  id?: string
  email?: string
  role?: string
  name?: string
  [key: string]: Primitive
}

function resolveSecret() {
  if (runtimeSecret) {
    return runtimeSecret
  }

  const envSecret = process.env.JWT_SECRET?.trim()
  if (envSecret && envSecret.length >= 32) {
    runtimeSecret = envSecret
    return runtimeSecret
  }

  const message =
    "JWT_SECRET must be configured to a string with at least 32 characters. Set this in your environment for production deployments."

  if (process.env.NODE_ENV === "production") {
    throw new Error(message)
  }

  if (!runtimeSecret) {
    console.warn(`${message} Using a fallback secret suitable for non-production use only.`)
  }

  runtimeSecret = process.env.NODE_ENV === "test" ? TEST_FALLBACK_SECRET : DEV_FALLBACK_SECRET
  return runtimeSecret
}

function normalizeRole(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase()
}

export function sanitizeInput(value: unknown): string {
  if (typeof value !== "string") {
    return ""
  }
  return value.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ").trim()
}

export async function verifyPassword(password: string, storedHash: string) {
  try {
    return await verifyPasswordWithScrypt(password, storedHash)
  } catch (error) {
    console.error("Password verification failed", error)
    return false
  }
}

export function generateToken(payload: TokenPayload, options: SignOptions = {}) {
  const secret = resolveSecret()
  const finalPayload: TokenPayload = { ...payload }
  if (!finalPayload.userId && typeof payload.id === "string" && payload.id) {
    finalPayload.userId = payload.id
  }
  return jwt.sign(finalPayload, secret, { expiresIn: DEFAULT_JWT_TTL, ...options })
}

export function verifyToken(token: string, options: VerifyOptions = {}) {
  const secret = resolveSecret()
  return jwt.verify(token, secret, options)
}

export function hasPermission(role: string, allowedRoles: string[]): boolean {
  if (!role || allowedRoles.length === 0) {
    return false
  }
  const normalized = normalizeRole(role)
  return allowedRoles.some((candidate) => normalizeRole(candidate) === normalized)
}
