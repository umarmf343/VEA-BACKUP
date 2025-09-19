import fs from "fs"
import path from "path"

import { readPersistentState, resetPersistentState, writePersistentState } from "@/lib/persistent-state"

const flushIO = () => new Promise((resolve) => setTimeout(resolve, 25))
const sanitizeKey = (key: string) => key.replace(/[^a-zA-Z0-9-_]/g, "_")

const keysToCleanup: string[] = []

const markForCleanup = (key: string) => {
  if (!keysToCleanup.includes(key)) {
    keysToCleanup.push(key)
  }
}

afterEach(async () => {
  for (const key of keysToCleanup) {
    resetPersistentState(key)
  }
  keysToCleanup.length = 0
  await flushIO()
})

describe("persistent-state cache refresh", () => {
  it("reloads the latest snapshot when another process updates the JSON file", async () => {
    const key = "persistent-state.external"
    markForCleanup(key)
    resetPersistentState(key)
    await flushIO()

    const initial = readPersistentState(key, () => ({ value: 1 }))
    expect(initial.value).toBe(1)

    await flushIO()

    const filePath = path.join(process.cwd(), "var", "data", `${sanitizeKey(key)}.json`)
    fs.writeFileSync(filePath, JSON.stringify({ value: 42 }))

    const updated = readPersistentState(key, () => ({ value: 0 }))
    expect(updated.value).toBe(42)
  })

  it("shares writes across module instances", async () => {
    const key = "persistent-state.shared"
    markForCleanup(key)
    resetPersistentState(key)
    await flushIO()

    writePersistentState(key, { version: 1 })
    await flushIO()

    jest.isolateModules(() => {
      const { readPersistentState: isolatedRead } = require("../lib/persistent-state") as typeof import("../lib/persistent-state")
      const snapshot = isolatedRead(key, () => ({ version: 0 }))
      expect(snapshot.version).toBe(1)
    })

    writePersistentState(key, { version: 2 })
    await flushIO()

    jest.isolateModules(() => {
      const { readPersistentState: isolatedRead } = require("../lib/persistent-state") as typeof import("../lib/persistent-state")
      const snapshot = isolatedRead(key, () => ({ version: 0 }))
      expect(snapshot.version).toBe(2)
    })
  })
})
