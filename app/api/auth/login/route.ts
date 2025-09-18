import { type NextRequest, NextResponse } from "next/server"
import {
  verifyPassword,
  generateToken,
  sanitizeInput,
  createRateLimit,
  getClientIp,
} from "@/lib/security"
import { getUserByEmail } from "@/lib/database"
import { authSecurity } from "@/lib/auth-service"

export const LOGIN_THROTTLE_LIMITS = {
  ip: { windowMs: 60 * 1000, max: 10 },
  username: { windowMs: 60 * 1000, max: 5 },
}

const LOGIN_RATE_LIMITS = {
  ip: createRateLimit(LOGIN_THROTTLE_LIMITS.ip.windowMs, LOGIN_THROTTLE_LIMITS.ip.max),
  username: createRateLimit(
    LOGIN_THROTTLE_LIMITS.username.windowMs,
    LOGIN_THROTTLE_LIMITS.username.max
  ),
}

const LOGIN_IP_KEY_PREFIX = "ip:"
const LOGIN_USER_KEY_PREFIX = "user:"

const formatRetrySeconds = (retryAfterMs?: number) => {
  if (!retryAfterMs || retryAfterMs <= 0) {
    return undefined
  }
  return Math.max(1, Math.ceil(retryAfterMs / 1000)).toString()
}

const humanizeDuration = (ms: number) => {
  const seconds = Math.ceil(ms / 1000)
  if (seconds >= 120) {
    const minutes = Math.ceil(seconds / 60)
    return `${minutes} minutes`
  }
  if (seconds >= 60) {
    return "1 minute"
  }
  return `${seconds} seconds`
}

const build429 = (message: string, retryAfterMs?: number) => {
  const headers: Record<string, string> = {}
  const retrySeconds = formatRetrySeconds(retryAfterMs)
  if (retrySeconds) {
    headers["Retry-After"] = retrySeconds
  }
  return NextResponse.json({ error: message }, { status: 429, headers })
}

const respondWithInvalidCredentials = (email: string) => {
  const { locked, lockoutUntil, remainingAttempts } = authSecurity.recordFailedAttempt(email)
  if (locked) {
    const retryAfter = lockoutUntil ? lockoutUntil - Date.now() : undefined
    const waitMessage = retryAfter
      ? `Account temporarily locked. Try again in ${humanizeDuration(retryAfter)}.`
      : "Account temporarily locked. Try again later."
    return build429(waitMessage, retryAfter)
  }

  const hint = remainingAttempts > 0 ? ` (${remainingAttempts} attempts remaining)` : ""
  return NextResponse.json({ error: `Invalid credentials${hint}` }, { status: 401 })
}

export const resetLoginThrottling = () => {
  LOGIN_RATE_LIMITS.ip.reset()
  LOGIN_RATE_LIMITS.username.reset()
  authSecurity.resetAll()
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const ipResult = LOGIN_RATE_LIMITS.ip.attempt(`${LOGIN_IP_KEY_PREFIX}${ip}`)
    if (!ipResult.success) {
      return build429("Too many login attempts from this IP. Please try again later.", ipResult.retryAfter)
    }

    const body = await request.json()

    // Sanitize inputs
    const emailRaw = typeof body.email === "string" ? body.email : String(body.email ?? "")
    const passwordRaw = typeof body.password === "string" ? body.password : String(body.password ?? "")
    const email = sanitizeInput(emailRaw)
    const password = sanitizeInput(passwordRaw)

    if (email) {
      const userKey = `${LOGIN_USER_KEY_PREFIX}${email.toLowerCase()}`
      const usernameResult = LOGIN_RATE_LIMITS.username.attempt(userKey)
      if (!usernameResult.success) {
        return build429("Too many login attempts for this account. Please try again shortly.", usernameResult.retryAfter)
      }

      const allowance = authSecurity.canAttempt(email)
      if (!allowance.allowed) {
        const waitMessage = allowance.retryAfter
          ? `Account temporarily locked. Try again in ${humanizeDuration(allowance.retryAfter)}.`
          : "Account temporarily locked. Try again later."
        return build429(waitMessage, allowance.retryAfter)
      }
    }

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Get user from database
    const user = await getUserByEmail(email)
    if (!user) {
      return respondWithInvalidCredentials(email)
    }

    // Verify password
    const storedHash = user.passwordHash ?? ""
    if (!storedHash) {
      return respondWithInvalidCredentials(email)
    }

    const isValidPassword = await verifyPassword(password, storedHash)
    if (!isValidPassword) {
      return respondWithInvalidCredentials(email)
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    authSecurity.resetFailures(email)
    LOGIN_RATE_LIMITS.username.reset(`${LOGIN_USER_KEY_PREFIX}${email.toLowerCase()}`)

    // Return user data without password
    const { passwordHash, ...userWithoutPassword } = user

    return NextResponse.json({
      user: userWithoutPassword,
      token,
      message: "Login successful",
    })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
