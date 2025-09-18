import { promises as fs } from "fs";
import path from "path";

import { getLogger } from "./logger";
import type { ReportCardRecord } from "./report-card-types";

interface MysqlModule {
  createPool(config: Record<string, unknown>): MysqlPool;
}

interface MysqlPoolConnection {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<[T, unknown]>;
  release(): void;
}

interface MysqlPool {
  query<T = unknown>(sql: string, values?: unknown[]): Promise<[T, unknown]>;
  getConnection(): Promise<MysqlPoolConnection>;
}

const logger = getLogger({ module: "report-card-repository" });

const DATA_DIR = process.env.REPORT_CARD_DATA_DIR || path.join(process.cwd(), "tmp", "data");
const DATA_FILE = path.join(DATA_DIR, "report-cards.json");
const FALLBACK_AFFECTIVE: ReportCardRecord["affectiveDomain"] = {
  neatness: "",
  honesty: "",
  punctuality: "",
};
const FALLBACK_PSYCHOMOTOR: ReportCardRecord["psychomotorDomain"] = {
  sport: "",
  handwriting: "",
};

let writeQueue: Promise<void> = Promise.resolve();
let writeQueueDepth = 0;
let poolPromise: Promise<MysqlPool | null> | null = null;
let schemaEnsured = false;

const hasDatabaseConfig = Boolean(
  process.env.DATABASE_URL ||
    (process.env.MYSQL_HOST && process.env.MYSQL_DATABASE && process.env.MYSQL_USER),
);

function getConnectionLimit(): number {
  const value = process.env.MYSQL_CONNECTION_LIMIT;
  if (!value) return 10;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
}

async function loadMysqlModule(): Promise<MysqlModule | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore -- optional dependency resolved at runtime when database credentials are provided
    const mod = (await import("mysql2/promise")) as MysqlModule;
    return mod;
  } catch (error) {
    logger.warn(
      { err: error },
      "mysql2/promise module is not available; continuing with file-based storage",
    );
    return null;
  }
}

async function getPool(): Promise<MysqlPool | null> {
  if (!hasDatabaseConfig) {
    return null;
  }

  if (!poolPromise) {
    poolPromise = (async () => {
      const mysql = await loadMysqlModule();
      if (!mysql) {
        return null;
      }

      try {
        const connectionLimit = getConnectionLimit();
        if (process.env.DATABASE_URL) {
          const url = new URL(process.env.DATABASE_URL);
          const searchParams = url.searchParams;
          const sslMode = searchParams.get("sslmode") || searchParams.get("ssl");
          const sslEnabled = sslMode === "require" || sslMode === "1" || sslMode === "true";
          const charset = searchParams.get("charset") || undefined;

          return mysql.createPool({
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
          });
        }

        return mysql.createPool({
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
        });
      } catch (error) {
        logger.error({ err: error }, "Failed to create MySQL pool for report card storage");
        return null;
      }
    })();
  }

  return poolPromise;
}

async function ensureDatabaseSchema(pool: MysqlPool): Promise<void> {
  if (schemaEnsured) {
    return;
  }

  const createTableStatement = `
    CREATE TABLE IF NOT EXISTS report_cards (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      student_id VARCHAR(64) NOT NULL,
      student_name VARCHAR(255) NOT NULL,
      admission_number VARCHAR(64) NULL,
      class_name VARCHAR(128) NOT NULL,
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
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      published_at DATETIME NULL,
      admin_feedback TEXT NULL,
      approvals JSON NOT NULL,
      metadata JSON NULL,
      INDEX idx_student_term (student_id, term, session),
      INDEX idx_status (status),
      INDEX idx_teacher (teacher_id)
    )
  `;

  try {
    await pool.query(createTableStatement);
    schemaEnsured = true;
  } catch (error) {
    logger.error({ err: error }, "Failed to ensure report card table schema");
    throw error;
  }
}

async function ensureStorageDirectory() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, "[]", "utf-8");
  }
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "object" && !Buffer.isBuffer(value)) {
    return value as T;
  }

  const text = Buffer.isBuffer(value) ? value.toString("utf-8") : String(value);
  if (text.length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

function coerceString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return fallback;
  }
  if (Buffer.isBuffer(value)) {
    return value.toString("utf-8");
  }
  return String(value);
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalIso(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(coerceString(value));
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function toDateValue(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

async function readFromFile(): Promise<ReportCardRecord[]> {
  await ensureStorageDirectory();
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as ReportCardRecord[];
    }
    return [];
  } catch (error) {
    logger.error({ err: error }, "Failed to read report card storage from disk");
    return [];
  }
}

async function readFromDatabase(pool: MysqlPool): Promise<ReportCardRecord[]> {
  await ensureDatabaseSchema(pool);

  const [rows] = await pool.query("SELECT * FROM report_cards ORDER BY updated_at DESC");
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => {
    const record = row as Record<string, unknown>;
    const subjects = parseJsonColumn<ReportCardRecord["subjects"]>(record.subjects_data, []);
    const affective = parseJsonColumn<ReportCardRecord["affectiveDomain"]>(
      record.affective_domain,
      FALLBACK_AFFECTIVE,
    );
    const psychomotor = parseJsonColumn<ReportCardRecord["psychomotorDomain"]>(
      record.psychomotor_domain,
      FALLBACK_PSYCHOMOTOR,
    );
    const approvals = parseJsonColumn<ReportCardRecord["approvals"]>(record.approvals, []);
    const metadata = parseJsonColumn<ReportCardRecord["metadata"] | undefined>(
      record.metadata,
      undefined,
    );

    const normalizedMetadata = metadata && Object.keys(metadata).length > 0 ? metadata : undefined;

    const result: ReportCardRecord = {
      id: coerceString(record.id),
      studentId: coerceString(record.student_id),
      studentName: coerceString(record.student_name),
      admissionNumber: coerceString(record.admission_number ?? ""),
      className: coerceString(record.class_name),
      term: coerceString(record.term),
      session: coerceString(record.session),
      status: coerceString(record.status) as ReportCardRecord["status"],
      teacherId: coerceString(record.teacher_id),
      teacherName: record.teacher_name ? coerceString(record.teacher_name) : undefined,
      subjects: subjects ?? [],
      affectiveDomain: affective ?? FALLBACK_AFFECTIVE,
      psychomotorDomain: psychomotor ?? FALLBACK_PSYCHOMOTOR,
      classTeacherRemarks: coerceString(record.class_teacher_remarks ?? ""),
      totalObtained: normalizeNumber(record.total_obtained),
      totalObtainable: normalizeNumber(record.total_obtainable),
      average: normalizeNumber(record.average),
      position: coerceString(record.position ?? "--"),
      submittedAt: toOptionalIso(record.submitted_at),
      updatedAt: toOptionalIso(record.updated_at) ?? new Date().toISOString(),
      publishedAt: toOptionalIso(record.published_at),
      adminFeedback: record.admin_feedback ? coerceString(record.admin_feedback) : undefined,
      approvals,
      metadata: normalizedMetadata,
    };

    return result;
  });
}

function serializeRecord(record: ReportCardRecord): unknown[] {
  const submittedAt = toDateValue(record.submittedAt ?? undefined);
  const updatedAt = toDateValue(record.updatedAt) ?? new Date();
  const publishedAt = toDateValue(record.publishedAt ?? undefined);
  const metadata = record.metadata && Object.keys(record.metadata).length > 0 ? record.metadata : undefined;

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
    record.teacherName ?? null,
    JSON.stringify(record.subjects ?? []),
    JSON.stringify(record.affectiveDomain ?? FALLBACK_AFFECTIVE),
    JSON.stringify(record.psychomotorDomain ?? FALLBACK_PSYCHOMOTOR),
    record.classTeacherRemarks ?? "",
    Number.isFinite(record.totalObtained) ? record.totalObtained : 0,
    Number.isFinite(record.totalObtainable) ? record.totalObtainable : 0,
    Number.isFinite(record.average) ? record.average : 0,
    record.position || "--",
    submittedAt,
    updatedAt,
    publishedAt,
    record.adminFeedback ?? null,
    JSON.stringify(record.approvals ?? []),
    metadata ? JSON.stringify(metadata) : null,
  ];
}

async function writeToFile(records: ReportCardRecord[]): Promise<void> {
  await ensureStorageDirectory();
  const payload = JSON.stringify(records, null, 2);
  const tempFile = `${DATA_FILE}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;

  try {
    await fs.writeFile(tempFile, payload, "utf-8");
    await fs.rename(tempFile, DATA_FILE);
  } finally {
    await fs.rm(tempFile, { force: true }).catch(() => undefined);
  }
}

async function writeToDatabase(pool: MysqlPool, records: ReportCardRecord[]): Promise<void> {
  await ensureDatabaseSchema(pool);
  const connection = await pool.getConnection();
  try {
    await connection.query("START TRANSACTION");
    await connection.query("DELETE FROM report_cards");

    if (records.length > 0) {
      const insertStatement = `
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
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `;

      for (const record of records) {
        const values = serializeRecord(record);
        await connection.query(insertStatement, values);
      }
    }

    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    connection.release();
  }
}

export function getReportCardWriteQueueDepth() {
  return writeQueueDepth;
}

export async function readReportCards(): Promise<ReportCardRecord[]> {
  const pool = await getPool();
  if (pool) {
    try {
      return await readFromDatabase(pool);
    } catch (error) {
      logger.error(
        { err: error },
        "Failed to read report card records from database; falling back to disk storage",
      );
    }
  }

  return readFromFile();
}

export async function writeReportCards(records: ReportCardRecord[]): Promise<void> {
  writeQueueDepth += 1;
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const pool = await getPool();
      if (pool) {
        try {
          await writeToDatabase(pool, records);
          return;
        } catch (error) {
          logger.error(
            { err: error },
            "Failed to persist report cards to database; attempting file storage instead",
          );
        }
      }

      await writeToFile(records);
    })
    .catch((error) => {
      logger.error({ err: error }, "Failed to persist report card records");
      throw error;
    })
    .finally(() => {
      writeQueueDepth = Math.max(0, writeQueueDepth - 1);
    });

  return writeQueue;
}

export const REPORT_CARD_DATA_FILE = DATA_FILE;
