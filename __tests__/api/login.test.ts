/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

import { POST } from "@/app/api/auth/login/route"

jest.mock("@/lib/database", () => ({
  getUserByEmail: jest.fn(),
}))

jest.mock("@/lib/security", () => ({
  verifyPassword: jest.fn(),
  generateToken: jest.fn(),
  sanitizeInput: (value: string) => value?.trim(),
}))

const { getUserByEmail } = jest.requireMock("@/lib/database") as {
  getUserByEmail: jest.Mock
}
const { verifyPassword, generateToken } = jest.requireMock("@/lib/security") as {
  verifyPassword: jest.Mock
  generateToken: jest.Mock
}

function createRequest(body: unknown) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns a token and user data for valid credentials", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      role: "Admin",
      passwordHash: "hashed",
      name: "Test User",
    }

    getUserByEmail.mockResolvedValue(mockUser)
    verifyPassword.mockResolvedValue(true)
    generateToken.mockReturnValue("signed-token")

    const response = await POST(
      createRequest({ email: "test@example.com", password: "secret" })
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toEqual({
      user: {
        id: "user-1",
        email: "test@example.com",
        role: "Admin",
        name: "Test User",
      },
      token: "signed-token",
      message: "Login successful",
    })
    expect(verifyPassword).toHaveBeenCalledWith("secret", "hashed")
    expect(generateToken).toHaveBeenCalledWith({
      userId: "user-1",
      email: "test@example.com",
      role: "Admin",
    })
  })

  it("rejects invalid credentials", async () => {
    getUserByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      role: "Admin",
      passwordHash: "hashed",
    })
    verifyPassword.mockResolvedValue(false)

    const response = await POST(
      createRequest({ email: "test@example.com", password: "wrong" })
    )

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json).toEqual({ error: "Invalid credentials" })
  })

  it("validates missing fields", async () => {
    const response = await POST(createRequest({ email: "" }))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json).toEqual({ error: "Email and password are required" })
    expect(getUserByEmail).not.toHaveBeenCalled()
  })
})
