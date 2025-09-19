import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals"
import { LOCKOUT_DURATION_MS, MAX_FAILED_ATTEMPTS } from "@/lib/auth-service"
import { LOGIN_THROTTLE_LIMITS, resetLoginThrottling } from "@/lib/login-throttle"
import {
  PAYMENT_INITIALIZE_RATE_LIMIT,
  resetInitializeRateLimit,
} from "@/lib/payments-initialize-rate-limit"
import {
  PAYMENT_VERIFY_RATE_LIMIT,
  resetVerifyRateLimit,
} from "@/lib/payments-verify-rate-limit"
import { resetPaymentsStore } from "@/lib/payments-store"

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init: ResponseInit = {}) => {
      const headers = new Headers(init.headers)
      if (!headers.has("content-type")) {
        headers.set("content-type", "application/json")
      }
      const status = init.status ?? 200
      return {
        status,
        headers,
        async json() {
          return body
        },
      } as unknown as Response
    },
  },
}))


jest.mock("@/lib/database", () => ({
  getUserByEmail: jest.fn(),
}))

const { getUserByEmail } = jest.requireMock("@/lib/database") as {
  getUserByEmail: jest.Mock
}

let loginPost: (req: Request) => Promise<Response>
let initializePost: (req: Request) => Promise<Response>
let verifyPost: (req: Request) => Promise<Response>

const advanceTime = (ms: number) => {
  const current = Date.now()
  jest.setSystemTime(current + ms)
}

const createLoginRequest = (ip: string, email: string, password = "Secret123!") => {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  })
  return {
    method: "POST",
    headers,
    json: async () => ({ email, password }),
  } as unknown as Request
}

const createInitializeRequest = (ip: string, studentId: string, amount: number) => {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  })
  return {
    method: "POST",
    headers,
    json: async () => ({ studentId, amount }),
  } as unknown as Request
}

const createVerifyRequest = (ip: string, reference: string) => {
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  })
  return {
    method: "POST",
    headers,
    json: async () => ({ reference }),
  } as unknown as Request
}

beforeAll(async () => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))

  const loginModule = await import("@/app/api/auth/login/route")
  loginPost = loginModule.POST as (req: Request) => Promise<Response>

  const initializeModule = await import("@/app/api/payments/initialize/route")
  initializePost = initializeModule.POST as (req: Request) => Promise<Response>

  const verifyModule = await import("@/app/api/payments/verify/route")
  verifyPost = verifyModule.POST as (req: Request) => Promise<Response>
})

afterAll(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  jest.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))
  resetLoginThrottling()
  resetInitializeRateLimit()
  resetVerifyRateLimit()
  getUserByEmail.mockReset()
  resetPaymentsStore()
})

describe("Login throttling", () => {
  it("blocks repeated login attempts from the same IP", async () => {
    getUserByEmail.mockResolvedValue(null)

    const ip = "203.0.113.1"

    for (let i = 0; i < LOGIN_THROTTLE_LIMITS.ip.max; i++) {
      const req = createLoginRequest(ip, `user${i}@example.com`)
      const res = await loginPost(req)
      expect(res.status).toBe(401)
    }

    const blocked = await loginPost(createLoginRequest(ip, "blocked@example.com"))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBeTruthy()
    const payload = await blocked.json()
    expect(payload.error).toMatch(/too many login attempts from this ip/i)
  })

  it("locks an account after repeated failures and exposes retry-after", async () => {
    getUserByEmail.mockResolvedValue(null)

    const ip = "198.51.100.5"
    const email = "locked@example.com"

    for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
      const res = await loginPost(createLoginRequest(ip, email))
      expect(res.status).toBe(401)
    }

    const locked = await loginPost(createLoginRequest(ip, email))
    expect(locked.status).toBe(429)
    const retryAfter = locked.headers.get("retry-after")
    expect(retryAfter).toBe(String(Math.ceil(LOCKOUT_DURATION_MS / 1000)))
    const payload = await locked.json()
    expect(payload.error).toMatch(/account temporarily locked/i)

    advanceTime(LOCKOUT_DURATION_MS + 1_000)

    const afterCooldown = await loginPost(createLoginRequest(ip, email))
    expect(afterCooldown.status).toBe(401)
  })
})

describe("Payment throttling", () => {
  it("limits payment initialization attempts per IP", async () => {
    const ip = "203.0.113.99"

    for (let i = 0; i < PAYMENT_INITIALIZE_RATE_LIMIT.max; i++) {
      const res = await initializePost(createInitializeRequest(ip, `STU-${i}`, 5000))
      expect(res.status).not.toBe(429)
    }

    const blocked = await initializePost(createInitializeRequest(ip, "STU-final", 5000))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBeTruthy()
  })

  it("limits payment verification attempts per IP", async () => {
    const ip = "198.51.100.77"

    for (let i = 0; i < PAYMENT_VERIFY_RATE_LIMIT.max; i++) {
      const res = await verifyPost(createVerifyRequest(ip, `REF-${i}`))
      expect(res.status).not.toBe(429)
    }

    const blocked = await verifyPost(createVerifyRequest(ip, "REF-final"))
    expect(blocked.status).toBe(429)
    expect(blocked.headers.get("retry-after")).toBeTruthy()
  })
})
