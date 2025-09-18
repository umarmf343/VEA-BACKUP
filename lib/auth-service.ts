import { randomUUID, scryptSync, timingSafeEqual } from "crypto"

import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

import { dbManager, type UserRecord, type StudentStatus } from "./database-manager"

export type UserRole =
  | "super_admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "librarian"
  | "accountant"

export type RoleLabel =
  | "Super Admin"
  | "Admin"
  | "Teacher"
  | "Student"
  | "Parent"
  | "Librarian"
  | "Accountant"

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: UserRole
  roleLabel: RoleLabel
  status: StudentStatus
  createdAt: string
  updatedAt?: string
  lastLogin?: string
  studentIds?: string[]
  subjects?: string[]
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  refreshTokenExpiresAt: string
}

export interface LoginResult {
  user: AuthenticatedUser
  tokens: TokenPair
}

export interface RefreshResult {
  user: AuthenticatedUser
  tokens: TokenPair
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  role: UserRole | string
  status?: StudentStatus
  studentIds?: string[]
  subjects?: string[]
}

export class AuthError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = "AuthError"
    this.status = status
  }
}

interface AccessTokenPayload {
  sub: string
  email: string
  name: string
  role: UserRole
  roleLabel: RoleLabel
  jti: string
  type: "access"
}

interface RefreshTokenPayload {
  sub: string
  role: UserRole
  jti: string
  type: "refresh"
}

const ROLE_LABELS: Record<UserRole, RoleLabel> = {
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  librarian: "Librarian",
  accountant: "Accountant",
}

const ROLE_RANK: Record<UserRole, number> = {
  super_admin: 7,
  admin: 6,
  teacher: 5,
  librarian: 4,
  accountant: 4,
  parent: 3,
  student: 2,
}

const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days
const BCRYPT_ROUNDS = 12
const LEGACY_KEY_LENGTH = 64

function resolveSecret(name: string, fallback: string): string {
  const value = process.env[name]
  if (value && value.length > 0) {
    return value
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`${name} is not configured`)
  }

  return fallback
}

const ACCESS_TOKEN_SECRET = () => resolveSecret("JWT_SECRET", "development-access-secret")
const REFRESH_TOKEN_SECRET = () =>
  resolveSecret("JWT_REFRESH_SECRET", `${resolveSecret("JWT_SECRET", "development-access-secret")}-refresh`)

function isLegacyHash(hash: string): boolean {
  return hash.includes(":")
}

function verifyLegacyPassword(password: string, legacyHash: string): boolean {
  const [salt, storedHex] = legacyHash.split(":")
  if (!salt || !storedHex) {
    return false
  }

  try {
    const derivedKey = scryptSync(password, salt, LEGACY_KEY_LENGTH)
    const storedKey = Buffer.from(storedHex, "hex")
    return storedKey.length === derivedKey.length && timingSafeEqual(derivedKey, storedKey)
  } catch {
    return false
  }
}

function computeExpiry(ms: number): string {
  return new Date(Date.now() + ms).toISOString()
}

function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

class AuthService {
  private normalizeRole(role: string): UserRole {
    const normalized = role.trim().toLowerCase().replace(/\s+/g, "_") as UserRole
    if (normalized in ROLE_LABELS) {
      return normalized
    }

    throw new AuthError(`Unsupported role: ${role}`, 400)
  }

  getRoleKey(role: string): UserRole {
    return this.normalizeRole(role)
  }

  getRoleLabel(role: string): RoleLabel {
    const key = this.normalizeRole(role)
    return ROLE_LABELS[key]
  }

  private buildUser(record: UserRecord): AuthenticatedUser {
    const role = this.normalizeRole(record.role)
    return {
      id: record.id,
      email: record.email,
      name: record.name,
      role,
      roleLabel: ROLE_LABELS[role],
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastLogin: record.lastLogin,
      studentIds: record.studentIds?.slice(),
      subjects: record.subjects?.slice(),
    }
  }

  private createTokenPair(user: AuthenticatedUser): TokenPair {
    const tokenId = randomUUID()
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roleLabel: user.roleLabel,
      jti: tokenId,
      type: "access",
    }

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      role: user.role,
      jti: tokenId,
      type: "refresh",
    }

    const accessToken = jwt.sign(accessPayload, ACCESS_TOKEN_SECRET(), { expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000) })
    const refreshToken = jwt.sign(refreshPayload, REFRESH_TOKEN_SECRET(), {
      expiresIn: Math.floor(REFRESH_TOKEN_TTL_MS / 1000),
    })

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: computeExpiry(ACCESS_TOKEN_TTL_MS),
      refreshTokenExpiresAt: computeExpiry(REFRESH_TOKEN_TTL_MS),
    }
  }

  private async findUserByEmail(email: string): Promise<UserRecord | null> {
    const normalized = sanitizeEmail(email)
    const users = await dbManager.getAllUsers()
    return users.find((user) => sanitizeEmail(user.email) === normalized) ?? null
  }

  private async findUserById(userId: string): Promise<UserRecord | null> {
    return (await dbManager.getUser(userId)) ?? null
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS)
  }

  async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash) {
      return false
    }

    if (storedHash.startsWith("$2")) {
      return bcrypt.compare(password, storedHash)
    }

    if (isLegacyHash(storedHash)) {
      return verifyLegacyPassword(password, storedHash)
    }

    return false
  }

  async setUserPassword(userId: string, password: string): Promise<AuthenticatedUser> {
    const hash = await this.hashPassword(password)
    const updated = await dbManager.updateUser(userId, { passwordHash: hash })
    return this.buildUser(updated)
  }

  async registerUser(input: RegisterInput): Promise<AuthenticatedUser> {
    const email = sanitizeEmail(input.email)
    const existing = await this.findUserByEmail(email)
    if (existing) {
      throw new AuthError("User already exists", 409)
    }

    const role = this.normalizeRole(input.role)
    const passwordHash = await this.hashPassword(input.password)

    const created = await dbManager.createUser({
      email,
      name: input.name,
      role,
      status: input.status ?? "active",
      passwordHash,
      studentIds: input.studentIds,
      subjects: input.subjects,
    })

    return this.buildUser(created)
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const userRecord = await this.findUserByEmail(email)
    if (!userRecord || userRecord.status !== "active") {
      throw new AuthError("Invalid credentials", 401)
    }

    const storedHash = userRecord.passwordHash ?? ""
    const isValid = await this.verifyPassword(password, storedHash)
    if (!isValid) {
      throw new AuthError("Invalid credentials", 401)
    }

    if (isLegacyHash(storedHash)) {
      await this.setUserPassword(userRecord.id, password)
    }

    const updatedRecord = await dbManager.updateUser(userRecord.id, { lastLogin: new Date().toISOString() })
    const user = this.buildUser(updatedRecord)
    const tokens = this.createTokenPair(user)

    return { user, tokens }
  }

  async refreshSession(refreshToken: string): Promise<RefreshResult> {
    let payload: RefreshTokenPayload
    try {
      payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET()) as RefreshTokenPayload
    } catch (error) {
      throw new AuthError("Invalid refresh token", 401)
    }

    if (payload.type !== "refresh" || !payload.sub) {
      throw new AuthError("Invalid refresh token", 401)
    }

    const userRecord = await this.findUserById(payload.sub)
    if (!userRecord || userRecord.status !== "active") {
      throw new AuthError("User is no longer available", 401)
    }

    const user = this.buildUser(userRecord)
    const tokens = this.createTokenPair(user)

    return { user, tokens }
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    let payload: AccessTokenPayload
    try {
      payload = jwt.verify(token, ACCESS_TOKEN_SECRET()) as AccessTokenPayload
    } catch (error) {
      throw new AuthError("Unauthorized", 401)
    }

    if (payload.type !== "access" || !payload.sub) {
      throw new AuthError("Unauthorized", 401)
    }

    return payload
  }

  hasPermission(userRole: string, requiredRoles: Array<UserRole | string>): boolean {
    let resolvedUserRole: UserRole
    try {
      resolvedUserRole = this.normalizeRole(userRole)
    } catch {
      return false
    }

    if (requiredRoles.length === 0) {
      return true
    }

    const requiredRank = Math.max(
      ...requiredRoles.map((role) => {
        try {
          return ROLE_RANK[this.normalizeRole(role)]
        } catch {
          return Number.NEGATIVE_INFINITY
        }
      }),
    )

    if (!Number.isFinite(requiredRank) || requiredRank < 0) {
      return false
    }

    return ROLE_RANK[resolvedUserRole] >= requiredRank
  }
}

export const authService = new AuthService()
