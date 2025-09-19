/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"
import type { RequestInit as NextRequestInit } from "next/dist/server/web/spec-extension/request"

import { GET, POST, PUT } from "@/app/api/users/route"

type DbMock = {
  getAllUsers: jest.Mock
  getUsersByRole: jest.Mock
  getUser: jest.Mock
  createUser: jest.Mock
  updateUser: jest.Mock
}

jest.mock("@/lib/database-manager", () => {
  const mockDb: DbMock = {
    getAllUsers: jest.fn(),
    getUsersByRole: jest.fn(),
    getUser: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
  }

  return {
    DatabaseManager: jest.fn(() => mockDb),
    __mockDb: mockDb,
  }
})

const { __mockDb: mockDb } = jest.requireMock("@/lib/database-manager") as {
  __mockDb: DbMock
}

function createRequest(url: string, init?: NextRequestInit) {
  if (!init) {
    return new NextRequest(url)
  }

  const normalizedInit: NextRequestInit =
    "signal" in init && init.signal === null ? { ...init, signal: undefined } : init

  return new NextRequest(url, normalizedInit)
}

describe("/api/users route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    Object.values(mockDb).forEach((fn) => fn.mockReset())
  })

  it("returns users filtered by role", async () => {
    mockDb.getUsersByRole.mockResolvedValue([{ id: "1", role: "Teacher" }])

    const response = await GET(
      createRequest("http://localhost/api/users?role=Teacher")
    )

    expect(response.status).toBe(200)
    expect(mockDb.getUsersByRole).toHaveBeenCalledWith("Teacher")
    const json = await response.json()
    expect(json.users).toEqual([{ id: "1", role: "Teacher" }])
  })

  it("creates a new user", async () => {
    const created = { id: "2", name: "Jane", role: "Parent" }
    mockDb.createUser.mockResolvedValue(created)

    const response = await POST(
      createRequest("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "Jane",
          email: "jane@example.com",
          role: "Parent",
          password: "secret",
        }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(200)
    expect(mockDb.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane",
        email: "jane@example.com",
        role: "Parent",
        status: "active",
      })
    )
    const json = await response.json()
    expect(json).toEqual({
      user: created,
      message: "User created successfully",
    })
  })

  it("updates an existing user", async () => {
    const updated = { id: "3", status: "inactive" }
    mockDb.updateUser.mockResolvedValue(updated)

    const response = await PUT(
      createRequest("http://localhost/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "3", status: "inactive" }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(200)
    expect(mockDb.updateUser).toHaveBeenCalledWith(
      "3",
      expect.objectContaining({ status: "inactive" })
    )
    const json = await response.json()
    expect(json).toEqual({
      user: updated,
      message: "User updated successfully",
    })
  })
})
