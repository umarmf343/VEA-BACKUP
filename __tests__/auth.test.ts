import { beforeAll, describe, expect, it } from "@jest/globals"

import jwt from "jsonwebtoken"

import { AuthError, authService } from "../lib/auth-service"
import { dbManager } from "../lib/database-manager"

describe("Auth service", () => {
  const testEmail = `spec-${Date.now()}@example.com`
  const testPassword = "TestPassword123!"
  let registeredUserId: string

  beforeAll(async () => {
    const registered = await authService.registerUser({
      name: "Spec User",
      email: testEmail,
      password: testPassword,
      role: "teacher",
    })

    registeredUserId = registered.id
  })

  it("stores a bcrypt hash for newly registered users", async () => {
    const userRecord = await dbManager.getUser(registeredUserId)
    expect(userRecord).toBeTruthy()
    expect(userRecord?.passwordHash).toBeDefined()
    expect(userRecord?.passwordHash?.startsWith("$2")).toBe(true)

    const matches = await authService.verifyPassword(testPassword, userRecord?.passwordHash ?? "")
    expect(matches).toBe(true)
  })

  it("logs in with valid credentials and returns token pair", async () => {
    const { user, tokens } = await authService.login(testEmail, testPassword)

    expect(user.email).toBe(testEmail)
    expect(tokens.accessToken).toBeTruthy()
    expect(tokens.refreshToken).toBeTruthy()
    expect(tokens.accessTokenExpiresAt).toBeTruthy()
    expect(tokens.refreshTokenExpiresAt).toBeTruthy()
  })

  it("allows login with case-insensitive email lookup", async () => {
    const { user } = await authService.login(testEmail.toUpperCase(), testPassword)
    expect(user.email).toBe(testEmail)
  })

  it("rejects invalid credentials", async () => {
    await expect(authService.login(testEmail, "WrongPassword123!")).rejects.toBeInstanceOf(AuthError)
  })

  it("refreshes sessions using a valid refresh token", async () => {
    const initial = await authService.login(testEmail, testPassword)
    const decoded = jwt.decode(initial.tokens.refreshToken)
    if (!decoded || typeof decoded !== "object" || typeof decoded.jti !== "string") {
      throw new Error("Expected refresh token to contain a jti claim")
    }

    const stored = await dbManager.getRefreshToken(decoded.jti)
    expect(stored).toBeTruthy()
    expect(stored?.userId).toBe(initial.user.id)

    const refreshed = await authService.refreshSession(initial.tokens.refreshToken)

    expect(refreshed.user.id).toBe(initial.user.id)
    expect(refreshed.tokens.accessToken).not.toBe(initial.tokens.accessToken)
    expect(refreshed.tokens.refreshToken).not.toBe(initial.tokens.refreshToken)
  })

  it("rejects reused refresh tokens after rotation", async () => {
    const loginResult = await authService.login(testEmail, testPassword)
    await authService.refreshSession(loginResult.tokens.refreshToken)

    await expect(authService.refreshSession(loginResult.tokens.refreshToken)).rejects.toBeInstanceOf(
      AuthError,
    )
  })

  it("revokes previously issued refresh tokens when logging in again", async () => {
    const firstLogin = await authService.login(testEmail, testPassword)
    const secondLogin = await authService.login(testEmail, testPassword)

    expect(firstLogin.tokens.refreshToken).not.toBe(secondLogin.tokens.refreshToken)

    await expect(authService.refreshSession(firstLogin.tokens.refreshToken)).rejects.toBeInstanceOf(
      AuthError,
    )
  })

  it("throws when verifying an access token missing required claims", () => {
    const token = jwt.sign(
      {
        sub: "test-user",
        type: "access",
        role: "teacher",
        roleLabel: "Teacher",
        jti: "test-jti",
        // intentionally omit name claim
      },
      process.env.JWT_SECRET ?? "development-access-secret",
      { expiresIn: 60 },
    )

    expect(() => authService.verifyAccessToken(token)).toThrow(AuthError)
  })

  it("evaluates permissions based on role hierarchy", () => {
    expect(authService.hasPermission("super_admin", ["admin"])).toBe(true)
    expect(authService.hasPermission("teacher", ["teacher"])).toBe(true)
    expect(authService.hasPermission("teacher", ["admin"])).toBe(false)
    expect(authService.hasPermission("teacher", ["teacher", "admin", "super_admin"])).toBe(true)
    expect(authService.hasPermission("admin", ["teacher"])).toBe(true)
    expect(authService.hasPermission("parent", ["teacher", "admin"])).toBe(false)
  })
})
