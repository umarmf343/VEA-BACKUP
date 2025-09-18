import { promises as fs } from "fs"
import type { Buffer } from "node:buffer"
import path from "path"
import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise"
import { createPool } from "mysql2/promise"

import type { ReportCardRecord } from "./report-card-types"

const DATA_DIR = process.env.REPORT_CARD_DATA_DIR || path.join(process.cwd(), "tmp", "data")
const DATA_FILE = path.join(DATA_DIR, "report-cards.json")

let writeQueue: Promise<void> = Promise.resolve()
let writeQueueDepth = 0

export function getReportCardWriteQueueDepth() {
  return writeQueueDepth
}
let pool: Pool | null = null
let schemaEnsured = false

const hasDatabaseConfig = Boolean(
  process.env.DATABASE_URL ||
    (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE && process.env.MYSQL_USER),
)

function getConnectionLimit(): number {
  const value = process.env.MYSQL_CONNECTION_LIMIT
  if (!value) return 10
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10
}

function getPool(): Pool | null {
  if (!hasDatabaseConfig) {
    return null
  }

  if (!pool) {
    const connectionLimit = getConnectionLimit()

    if (process.env.DATABASE_URL) {
      const url = new URL(process.env.DATABASE_URL)
      const searchParams = url.searchParams
      const sslMode = searchParams.get("sslmode") || searchParams.get("ssl")
      const sslEnabled = sslMode === "require" || sslMode === "1" || sslMode === "true"
      const charset = searchParams.get("charset") || undefined

      pool = createPool({
        host: url.hostname,
        port: url.port ? Number(url.port) : 3306,
        user: decodeURIComponent(url.username),
        password: url.password ? decodeURIComponent(url.password) : undefined,
        database: url.pathname.replace(/^\//, ""),
        waitForConnections: true,
        connectionLimit,
        namedPlaceholders: false,
        charset,
        ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
      })
    } else {
      pool = createPool({
        host: process.env.MYSQL_HOST,
        port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
        waitForConnections: true,
        connectionLimit,
        namedPlaceholders: false,
        charset: process.env.MYSQL_CHARSET,
        ssl:
          process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1"
            ? { rejectUnauthorized: false }
            : undefined,
      })
    }
  }

  return pool
}

async function ensureStorageDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8")
  }
}

async function ensureDatabaseSchema(): Promise<void> {
  const currentPool = getPool()
  if (!currentPool || schemaEnsured) {
    return
  }

  const createTableStatement = `
    CREATE TABLE IF NOT EXISTS report_cards (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      admission_number VARCHAR(64) NULL,
      class_name VARCHAR(64) NOT NULL,
      term VARCHAR(32) NOT NULL,
      session VARCHAR(32) NOT NULL,
      status ENUM('draft','submitted','approved','revoked','published') DEFAULT 'submitted',
      teacher_id VARCHAR(64) NOT NULL,
      teacher_name VARCHAR(255) NULL,
      subjects_data JSON NOT NULL,
      affective_domain JSON NOT NULL,
      psychomotor_domain JSON NOT NULL,
      class_teacher_remarks TEXT NULL,
      total_obtained DECIMAL(10,2) DEFAULT 0,
      total_obtainable DECIMAL(10,2) DEFAULT 0,
      average DECIMAL(6,2) DEFAULT 0,
      position VARCHAR(32) DEFAULT '--',
      submitted_at DATETIME NULL,
      updated_at DATETIME NOT NULL,
      published_at DATETIME NULL,
      admin_feedback TEXT NULL,
      approvals JSON NOT NULL,
      metadata JSON NULL,
      UNIQUE KEY unique_student_term (student_id, term, session),
      INDEX idx_status (status),
      INDEX idx_class_term_session (class_name, term, session)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `

  await currentPool.query(createTableStatement)
  schemaEnsured = true
}

type JsonColumn = string | Buffer | null

type ReportCardRow = RowDataPacket & {
  id: string
  student_id: string
  student_name: string
  admission_number: string | null
  class_name: string
  term: string
  session: string
  status: string
  teacher_id: string
  teacher_name: string | null
  subjects_data: string | Buffer
  affective_domain: string | Buffer
  psychomotor_domain: string | Buffer
  class_teacher_remarks: string | null
  total_obtained: number | null
  total_obtainable: number | null
  average: number | null
  position: string | null
  submitted_at: Date | string | null
  updated_at: Date | string
  published_at: Date | string | null
  admin_feedback: string | null
  approvals: string | Buffer
  metadata: string | Buffer | null
}

function parseJsonValue<T>(value: JsonColumn, fallback: T): T {
  if (!value) return fallback
  const text = typeof value === "string" ? value : value.toString("utf8")
  try {
    return JSON.parse(text) as T
  } catch (error) {
    console.error("Failed to parse JSON from report_cards storage", error)
    return fallback
  }
}

function toIsoString(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  if (typeof value === "string") {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
  }
  return value.toISOString()
}

function mapRowToRecord(row: ReportCardRow): ReportCardRecord {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    admissionNumber: row.admission_number || undefined,
    className: row.class_name,
    term: row.term,
    session: row.session,
    status: row.status as ReportCardRecord["status"],
    teacherId: row.teacher_id,
    teacherName: row.teacher_name || undefined,
    subjects: parseJsonValue(row.subjects_data, []),
    affectiveDomain: parseJsonValue(row.affective_domain, {
      neatness: "Good",
      honesty: "Good",
      punctuality: "Good",
    }),
    psychomotorDomain: parseJsonValue(row.psychomotor_domain, {
      sport: "Good",
      handwriting: "Good",
    }),
    classTeacherRemarks: row.class_teacher_remarks || "",
    totalObtained: Number(row.total_obtained || 0),
    totalObtainable: Number(row.total_obtainable || 0),
    average: Number(row.average || 0),
    position: row.position || "--",
    submittedAt: toIsoString(row.submitted_at),
    updatedAt: toIsoString(row.updated_at) || new Date().toISOString(),
    publishedAt: toIsoString(row.published_at),
    adminFeedback: row.admin_feedback || undefined,
    approvals: parseJsonValue(row.approvals, []),
    metadata: parseJsonValue(row.metadata, {}),
  }
}

function recordToParams(record: ReportCardRecord) {
  const subjects = JSON.stringify(record.subjects || [])
  const affective = JSON.stringify(record.affectiveDomain || {})
  const psychomotor = JSON.stringify(record.psychomotorDomain || {})
  const approvals = JSON.stringify(record.approvals || [])
  const metadata = record.metadata ? JSON.stringify(record.metadata) : null

  const toDate = (value: string | undefined) => {
    if (!value) return null
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return [
    record.id,
    record.studentId,
    record.studentName,
    record.admissionNumber || null,
    record.className,
    record.term,
    record.session,
    record.status,
    record.teacherId,
    record.teacherName || null,
    subjects,
    affective,
    psychomotor,
    record.classTeacherRemarks || "",
    Number(record.totalObtained || 0),
    Number(record.totalObtainable || 0),
    Number(record.average || 0),
    record.position || "--",
    toDate(record.submittedAt),
    toDate(record.updatedAt) || new Date(),
    toDate(record.publishedAt),
    record.adminFeedback || null,
    approvals,
    metadata,
  ]
}

async function readFromDatabase(): Promise<ReportCardRecord[]> {
  const currentPool = getPool()
  if (!currentPool) {
    return []
  }

  await ensureDatabaseSchema()
  const [rows] = await currentPool.query<ReportCardRow[]>("SELECT * FROM report_cards")
  return rows.map(mapRowToRecord)
}

async function writeToDatabase(records: ReportCardRecord[]): Promise<void> {
  const currentPool = getPool()
  if (!currentPool) {
    return
  }

  await ensureDatabaseSchema()
  const connection: PoolConnection = await currentPool.getConnection()

  try {
    await connection.beginTransaction()
    const ids = new Set<string>()

    for (const record of records) {
      ids.add(record.id)
      const params = recordToParams(record)
      await connection.query(
        `
          INSERT INTO report_cards (
            id,
            student_id,
            student_name,
            admission_number,
            class_name,
            term,
            session,
            status,
            teacher_id,
            teacher_name,
            subjects_data,
            affective_domain,
            psychomotor_domain,
            class_teacher_remarks,
            total_obtained,
            total_obtainable,
            average,
            position,
            submitted_at,
            updated_at,
            published_at,
            admin_feedback,
            approvals,
            metadata
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            student_id = VALUES(student_id),
            student_name = VALUES(student_name),
            admission_number = VALUES(admission_number),
            class_name = VALUES(class_name),
            term = VALUES(term),
            session = VALUES(session),
            status = VALUES(status),
            teacher_id = VALUES(teacher_id),
            teacher_name = VALUES(teacher_name),
            subjects_data = VALUES(subjects_data),
            affective_domain = VALUES(affective_domain),
            psychomotor_domain = VALUES(psychomotor_domain),
            class_teacher_remarks = VALUES(class_teacher_remarks),
            total_obtained = VALUES(total_obtained),
            total_obtainable = VALUES(total_obtainable),
            average = VALUES(average),
            position = VALUES(position),
            submitted_at = VALUES(submitted_at),
            updated_at = VALUES(updated_at),
            published_at = VALUES(published_at),
            admin_feedback = VALUES(admin_feedback),
            approvals = VALUES(approvals),
            metadata = VALUES(metadata)
        `,
        params,
      )
    }

    if (records.length === 0) {
      await connection.query("DELETE FROM report_cards")
    } else {
      await connection.query("DELETE FROM report_cards WHERE id NOT IN (?)", [Array.from(ids)])
    }

    await connection.commit()
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

export async function readReportCards(): Promise<ReportCardRecord[]> {
  if (hasDatabaseConfig) {
    try {
      return await readFromDatabase()
    } catch (error) {
      console.error("Falling back to file storage for report cards", error)
    }
  }

  await ensureStorageDirectory()
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
  if (hasDatabaseConfig) {
    writeQueueDepth += 1
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(async () => {
        try {
          await writeToDatabase(records)
          return
        } catch (error) {
          console.error("Failed to write report cards to database", error)
          throw error
        } finally {
          writeQueueDepth = Math.max(0, writeQueueDepth - 1)
        }
      })
    return writeQueue
  }

  await ensureStorageDirectory()
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
        writeQueueDepth = Math.max(0, writeQueueDepth - 1)
      }
    })

  return writeQueue
}

export const REPORT_CARD_DATA_FILE = DATA_FILE
