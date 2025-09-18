import { promises as fs } from "fs"
import path from "path"
import type { ReportCardRecord } from "./report-card-types"

const DATA_DIR = process.env.REPORT_CARD_DATA_DIR || path.join(process.cwd(), "tmp", "data")
const DATA_FILE = path.join(DATA_DIR, "report-cards.json")

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8")
  }
}

let writeQueue: Promise<void> = Promise.resolve()
let writeQueueDepth = 0

export function getReportCardWriteQueueDepth() {
  return writeQueueDepth
}

export async function readReportCards(): Promise<ReportCardRecord[]> {
  await ensureStorage()
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8")
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed as ReportCardRecord[]
    }
    return []
  } catch (error) {
    console.error("Failed to read report card storage", error)
    return []
  }
}

export async function writeReportCards(records: ReportCardRecord[]): Promise<void> {
  await ensureStorage()
  const payload = JSON.stringify(records, null, 2)
  const tempFile = `${DATA_FILE}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`

  writeQueueDepth += 1
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await fs.writeFile(tempFile, payload, "utf-8")
        await fs.rename(tempFile, DATA_FILE)
      } finally {
        await fs.rm(tempFile, { force: true }).catch(() => undefined)
      }
    })
    .finally(() => {
      writeQueueDepth = Math.max(0, writeQueueDepth - 1)
    })

  return writeQueue
}

export const REPORT_CARD_DATA_FILE = DATA_FILE
