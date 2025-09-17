import { randomBytes, scrypt as scryptCallback, scryptSync, timingSafeEqual } from "crypto"
import { promisify } from "util"

export type UserRole = "super_admin" | "admin" | "teacher" | "student" | "parent" | "librarian" | "accountant"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
  lastLogin?: string
  profileImage?: string
  metadata?: Record<string, any>
}

export interface AuthSession {
  user: User
  token: string
  expiresAt: string
}

type StoredUser = User & { passwordHash: string }

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000
const SALT_SIZE = 16
const DERIVED_KEY_LENGTH = 64

const scrypt = promisify(scryptCallback)

const defaultUsers: StoredUser[] = [
  {
    id: "user-super-admin",
    email: "superadmin@vea.edu.ng",
    name: "Super Administrator",
    role: "super_admin",
    isActive: true,
    passwordHash:
      "c1d2e3f405162738c1d2e3f405162738:b33b024944a9ab998b9632b87ce1a15eb7553756a8a3d53e52390777d0bc87578081127eb7fd55f894d03b4ef49158bfc928f22869a5832dc8d63930cc5244bc",
    metadata: { seeded: true },
  },
  {
    id: "user-admin",
    email: "admin@vea.edu.ng",
    name: "School Administrator",
    role: "admin",
    isActive: true,
    passwordHash:
      "a1b2c3d4e5f60718a1b2c3d4e5f60718:7c91938b80e242c80d68a5e1d21883c753c5180bab223dc2cb15ad097aba84e6abcb75d4d9f4812fd7d86a432719c490637005f23a9c3fe326bec418b94ab98c",
    metadata: { seeded: true },
  },
]

const userStore: StoredUser[] = defaultUsers.map((user) => ({ ...user }))

const activeSessions = new Map<string, { userId: string; expiresAt: number }>()

const normalizeEmail = (email: string) => email.trim().toLowerCase()

const sanitizeUser = (user: StoredUser): User => {
  const { passwordHash: _passwordHash, ...safeUser } = user
  return { ...safeUser }
}

const findUserByEmail = (email: string): StoredUser | undefined => {
  const normalizedEmail = normalizeEmail(email)
  return userStore.find((user) => normalizeEmail(user.email) === normalizedEmail)
}

const findUserById = (id: string): StoredUser | undefined => {
  return userStore.find((user) => user.id === id)
}

const verifyPasswordSync = (password: string, storedHash: string): boolean => {
  const [salt, hashed] = storedHash.split(":")
  if (!salt || !hashed) {
    return false
  }

  try {
    const derivedKey = scryptSync(password, salt, DERIVED_KEY_LENGTH)
    const storedKeyBuffer = Buffer.from(hashed, "hex")

    if (storedKeyBuffer.length !== derivedKey.length) {
      return false
    }

    return timingSafeEqual(derivedKey, storedKeyBuffer)
  } catch (error) {
    console.error("Password verification error:", error)
    return false
  }
}

const createSession = (userId: string) => {
  const token = randomBytes(32).toString("hex")
  const expiresAt = Date.now() + SESSION_DURATION_MS

  activeSessions.set(token, { userId, expiresAt })

  return { token, expiresAt: new Date(expiresAt).toISOString() }
}

const getSession = (token: string) => {
  const session = activeSessions.get(token)
  if (!session) {
    return null
  }

  if (session.expiresAt <= Date.now()) {
    activeSessions.delete(token)
    return null
  }

  return session
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = randomBytes(SALT_SIZE).toString("hex")
  const derivedKey = (await scrypt(password, salt, DERIVED_KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString("hex")}`
}

export const verifyPassword = async (password: string, storedHash: string): Promise<boolean> => {
  return verifyPasswordSync(password, storedHash)
}

export const validateUser = (email: string, password: string): User | null => {
  const userRecord = findUserByEmail(email)
  if (!userRecord || !userRecord.isActive) {
    return null
  }

  const isValidPassword = verifyPasswordSync(password, userRecord.passwordHash)
  if (!isValidPassword) {
    return null
  }

  userRecord.lastLogin = new Date().toISOString()
  return sanitizeUser(userRecord)
}

export const auth = {
  login: async (email: string, password: string): Promise<AuthSession | null> => {
    try {
      const userRecord = findUserByEmail(email)
      if (!userRecord || !userRecord.isActive) {
        return null
      }

      const isValidPassword = verifyPasswordSync(password, userRecord.passwordHash)
      if (!isValidPassword) {
        return null
      }

      userRecord.lastLogin = new Date().toISOString()

      const { token, expiresAt } = createSession(userRecord.id)

      return {
        user: sanitizeUser(userRecord),
        token,
        expiresAt,
      }
    } catch (error) {
      console.error("Login error:", error)
      return null
    }
  },

  validateToken: async (token: string): Promise<User | null> => {
    try {
      const session = getSession(token)
      if (!session) {
        return null
      }

      const userRecord = findUserById(session.userId)
      if (!userRecord || !userRecord.isActive) {
        return null
      }

      return sanitizeUser(userRecord)
    } catch (error) {
      console.error("Token validation error:", error)
      return null
    }
  },

  hasPermission: (userRole: UserRole, requiredRole: UserRole): boolean => {
    const roleHierarchy: Record<UserRole, number> = {
      super_admin: 7,
      admin: 6,
      teacher: 5,
      librarian: 4,
      accountant: 4,
      parent: 3,
      student: 2,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  },

  register: async (userData: {
    name: string
    email: string
    password: string
    role: UserRole
    metadata?: Record<string, any>
  }): Promise<User | null> => {
    try {
      const existingUser = findUserByEmail(userData.email)
      if (existingUser) {
        throw new Error("User already exists")
      }

      const hashedPassword = await hashPassword(userData.password)
      const newUser: StoredUser = {
        id: `user-${randomBytes(8).toString("hex")}`,
        email: userData.email.trim(),
        name: userData.name,
        role: userData.role,
        isActive: true,
        passwordHash: hashedPassword,
        metadata: userData.metadata,
      }

      userStore.push(newUser)

      return sanitizeUser(newUser)
    } catch (error) {
      console.error("Registration error:", error)
      return null
    }
  },

  logout: async (token: string): Promise<boolean> => {
    try {
      return activeSessions.delete(token)
    } catch (error) {
      console.error("Logout error:", error)
      return false
    }
  },
}
