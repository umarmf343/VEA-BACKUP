import { randomBytes } from "crypto"

import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken"

import { verifyPassword as verifyPasswordWithScrypt } from "./auth"

const DEFAULT_JWT_TTL = "24h"

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

  const envSecret = process.env.JWT_SECRET
  if (typeof envSecret === "string" && envSecret.trim().length >= 32) {
    runtimeSecret = envSecret.trim()
    return runtimeSecret
  }

  runtimeSecret = randomBytes(48).toString("hex")
  if (process.env.NODE_ENV !== "production") {
    console.warn("JWT_SECRET is not configured. Generated an ephemeral secret for this runtime instance.")
  }
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
