import fs from "fs"
import fsPromises from "fs/promises"
import path from "path"

const DEFAULT_DATA_DIR = path.join(process.cwd(), "var", "data")

const dataDir = (() => {
  const envDir = process.env.APP_DATA_DIR?.trim()
  if (envDir) {
    return path.resolve(envDir)
  }
  return DEFAULT_DATA_DIR
})()

type CacheEntry<T> = {
  value: T
  mtimeMs: number
}

const cache = new Map<string, CacheEntry<unknown>>()

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

ensureDataDir()

function sanitizeKey(key: string) {
  return key.replace(/[^a-zA-Z0-9-_]/g, "_")
}

function filePathForKey(key: string) {
  return path.join(dataDir, `${sanitizeKey(key)}.json`)
}

async function writeToDisk(key: string, value: unknown) {
  const filePath = filePathForKey(key)
  const serialized = JSON.stringify(value, null, 2)
  try {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true })
    await fsPromises.writeFile(filePath, serialized, "utf8")
  } catch (error) {
    console.error(`Failed to persist state for ${key}`, error)
  }
}

function getFileStats(filePath: string): fs.Stats | null {
  try {
    return fs.statSync(filePath)
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === "ENOENT") {
      return null
    }
    throw error
  }
}

function setCacheEntry<T>(key: string, value: T, mtimeMs: number) {
  cache.set(key, { value, mtimeMs })
}

export function readPersistentState<T>(key: string, initializer: () => T): T {
  const filePath = filePathForKey(key)
  const fileStats = getFileStats(filePath)
  const cachedEntry = cache.get(key) as CacheEntry<T> | undefined

  if (cachedEntry && (!fileStats || fileStats.mtimeMs <= cachedEntry.mtimeMs)) {
    return cachedEntry.value
  }

  if (!fileStats) {
    const initialValue = initializer()
    setCacheEntry(key, initialValue, Date.now())
    ensureDataDir()
    void writeToDisk(key, initialValue)
    return initialValue
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8")
    const parsed = JSON.parse(raw) as T
    setCacheEntry(key, parsed, fileStats.mtimeMs)
    return parsed
  } catch (error) {
    console.warn(`Failed to read persistent state for ${key}. Recreating file.`, error)
    const fallback = initializer()
    setCacheEntry(key, fallback, Date.now())
    ensureDataDir()
    void writeToDisk(key, fallback)
    return fallback
  }
}

export function writePersistentState<T>(key: string, value: T) {
  setCacheEntry(key, value, Date.now())
  ensureDataDir()
  void writeToDisk(key, value)
}

export function resetPersistentState(key?: string) {
  if (typeof key === "string") {
    cache.delete(key)
    const filePath = filePathForKey(key)
    void fsPromises.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        console.error(`Failed to remove persisted state for ${key}`, error)
      }
    })
    return
  }

  cache.clear()
  if (!fs.existsSync(dataDir)) {
    return
  }
  for (const file of fs.readdirSync(dataDir)) {
    if (file.endsWith(".json")) {
      const target = path.join(dataDir, file)
      void fsPromises.unlink(target).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") {
          console.error(`Failed to remove persisted state file ${target}`, error)
        }
      })
    }
  }
}
