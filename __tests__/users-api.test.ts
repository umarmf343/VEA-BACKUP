/**
 * @jest-environment node
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals"

import { PATCH } from "../app/api/users/route"
import { dbManager } from "../lib/database-manager"

const TEST_USER_ID = "usr-teacher-1"

async function invokePatch(payload: unknown) {
  const request = new Request("http://localhost/api/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  return PATCH(request as any)
}

describe("/api/users PATCH handler", () => {
  let originalUser: Awaited<ReturnType<typeof dbManager.getUser>>

  beforeEach(async () => {
    originalUser = await dbManager.getUser(TEST_USER_ID)
    expect(originalUser).toBeTruthy()
  })

  afterEach(async () => {
    if (originalUser) {
      const { id: _, ...rest } = originalUser
      await dbManager.updateUser(TEST_USER_ID, rest)
    }
  })

  it("applies partial updates and returns the updated user", async () => {
    const response = await invokePatch({
      id: TEST_USER_ID,
      updates: { name: "Updated Teacher", status: "inactive" },
    })

    expect(response.status).toBe(200)
    const payload = await response.json()

    expect(payload.user).toMatchObject({
      id: TEST_USER_ID,
      name: "Updated Teacher",
      status: "inactive",
    })

    const stored = await dbManager.getUser(TEST_USER_ID)
    expect(stored?.name).toBe("Updated Teacher")
    expect(stored?.status).toBe("inactive")
  })

  it("supports suspension toggles via updates", async () => {
    const suspendResponse = await invokePatch({
      id: TEST_USER_ID,
      updates: { status: "suspended" },
    })
    expect(suspendResponse.status).toBe(200)
    const suspendedPayload = await suspendResponse.json()
    expect(suspendedPayload.user.status).toBe("suspended")

    const restoreResponse = await invokePatch({
      id: TEST_USER_ID,
      updates: { status: "active" },
    })
    expect(restoreResponse.status).toBe(200)
    const restoredPayload = await restoreResponse.json()
    expect(restoredPayload.user.status).toBe("active")
  })
})
