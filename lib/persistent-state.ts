import fs from "fs"
import path from "path"

const DEFAULT_DATA_DIR = path.join(process.cwd(), "tmp", "data")

const dataDir = (() => {
  const envDir = process.env.APP_DATA_DIR?.trim()
  if (envDir) {
    return path.resolve(envDir)
  }
  return DEFAULT_DATA_DIR
})()

const cache = new Map<string, unknown>()

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

function sanitizeKey(key: string) {
  return key.replace(/[^a-zA-Z0-9-_]/g, "_")
}

function filePathForKey(key: string) {
  return path.join(dataDir, `${sanitizeKey(key)}.json`)
}

export function readPersistentState<T>(key: string, initializer: () => T): T {
  if (cache.has(key)) {
    return cache.get(key) as T
  }

  const filePath = filePathForKey(key)

  if (!fs.existsSync(filePath)) {
    const initialValue = initializer()
    cache.set(key, initialValue)
    ensureDataDir()
    fs.writeFileSync(filePath, JSON.stringify(initialValue, null, 2), "utf8")
    return initialValue
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw) as T
    cache.set(key, parsed)
    return parsed
  } catch (error) {
    console.warn(`Failed to read persistent state for ${key}. Recreating file.`, error)
    const fallback = initializer()
    cache.set(key, fallback)
    ensureDataDir()
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), "utf8")
    return fallback
  }
}

export function writePersistentState<T>(key: string, value: T) {
  cache.set(key, value)
  ensureDataDir()
  fs.writeFileSync(filePathForKey(key), JSON.stringify(value, null, 2), "utf8")
}

export function resetPersistentState(key?: string) {
  if (typeof key === "string") {
    cache.delete(key)
    const filePath = filePathForKey(key)
    try {
      fs.unlinkSync(filePath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error
      }
    }
    return
  }

  cache.clear()
  if (!fs.existsSync(dataDir)) {
    return
  }
  for (const file of fs.readdirSync(dataDir)) {
    if (file.endsWith(".json")) {
      try {
        fs.unlinkSync(path.join(dataDir, file))
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error
        }
      }
    }
  }
}
