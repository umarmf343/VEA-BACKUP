import jwt, { SignOptions, VerifyOptions } from "jsonwebtoken"

import { verifyPassword as verifyPasswordWithScrypt } from "./auth"

const DEFAULT_JWT_TTL = "24h"
const FALLBACK_SECRET = "vea-portal-development-secret"

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
  const secret = process.env.JWT_SECRET
  if (typeof secret === "string" && secret.trim().length > 0) {
    return secret
  }
  return FALLBACK_SECRET
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
  const finalPayload: TokenPayload = {
    ...payload,
    userId: payload.userId ?? payload.id,
  }
  if (!finalPayload.email && typeof payload.email === "string") {
    finalPayload.email = payload.email
  }
  if (!finalPayload.role && typeof payload.role === "string") {
    finalPayload.role = payload.role
  }
  if (!finalPayload.name && typeof payload.name === "string") {
    finalPayload.name = payload.name
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
