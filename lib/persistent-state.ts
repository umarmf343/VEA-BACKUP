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

const cache = new Map<string, unknown>()
const writeQueues = new Map<string, Promise<void>>()
const writeGenerations = new Map<string, number>()

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

function tempFilePath(filePath: string) {
  const unique = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${filePath}.${unique}.tmp`
}

async function commitToDisk(key: string, serialized: string, filePath: string, generation: number) {
  if ((writeGenerations.get(key) ?? 0) !== generation) {
    return
  }

  const tempPath = tempFilePath(filePath)

  try {
    await fsPromises.mkdir(path.dirname(filePath), { recursive: true })
    await fsPromises.writeFile(tempPath, serialized, "utf8")
    if ((writeGenerations.get(key) ?? 0) !== generation) {
      await fsPromises.unlink(tempPath).catch((cleanupError) => {
        const nodeError = cleanupError as NodeJS.ErrnoException
        if (nodeError?.code !== "ENOENT") {
          console.error(`Failed to clean up temporary state file for ${key}`, cleanupError)
        }
      })
      return
    }
    await fsPromises.rename(tempPath, filePath)
  } catch (error) {
    console.error(`Failed to persist state for ${key}`, error)
    try {
      await fsPromises.unlink(tempPath)
    } catch (cleanupError) {
      const nodeError = cleanupError as NodeJS.ErrnoException
      if (nodeError?.code !== "ENOENT") {
        console.error(`Failed to clean up temporary state file for ${key}`, cleanupError)
      }
    }
    throw error
  }
}

function currentGeneration(key: string) {
  if (!writeGenerations.has(key)) {
    writeGenerations.set(key, 0)
  }
  return writeGenerations.get(key) ?? 0
}

function scheduleWrite(key: string, value: unknown) {
  const filePath = filePathForKey(key)
  const serialized = JSON.stringify(value, null, 2)
  const generation = currentGeneration(key)
  const previous = writeQueues.get(key) ?? Promise.resolve()
  const operation = () => commitToDisk(key, serialized, filePath, generation)
  const next = previous.catch(() => undefined).then(operation)
  const final = next.catch(() => undefined).finally(() => {
    if (writeQueues.get(key) === final) {
      writeQueues.delete(key)
    }
  })
  writeQueues.set(key, final)
  return final
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
    scheduleWrite(key, initialValue)
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
    scheduleWrite(key, fallback)
    return fallback
  }
}

export function writePersistentState<T>(key: string, value: T) {
  cache.set(key, value)
  ensureDataDir()
  scheduleWrite(key, value)
}

export function resetPersistentState(key?: string) {
  if (typeof key === "string") {
    cache.delete(key)
    writeQueues.delete(key)
    writeGenerations.set(key, currentGeneration(key) + 1)
    const filePath = filePathForKey(key)
    void fsPromises.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        console.error(`Failed to remove persisted state for ${key}`, error)
      }
    })
    return
  }

  cache.clear()
  const knownKeys = new Set<string>([...writeGenerations.keys(), ...writeQueues.keys()])
  for (const existingKey of knownKeys) {
    writeGenerations.set(existingKey, currentGeneration(existingKey) + 1)
    writeQueues.delete(existingKey)
  }
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
