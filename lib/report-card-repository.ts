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
  await fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), "utf-8")
}

export const REPORT_CARD_DATA_FILE = DATA_FILE
