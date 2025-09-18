import { readFileSync } from "node:fs"
import { join } from "node:path"

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createTestClient() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require("pg-mem")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require("@prisma/adapter-pg")

  const db = newDb()
  const adapter = new PrismaPg(db.adapters.createPg())
  const migrationPath = join(process.cwd(), "prisma/migrations/20241011000000_init/migration.sql")
  const sql = readFileSync(migrationPath, "utf8")
  db.public.none(sql)

  return new PrismaClient({ adapter, log: ["error"] })
}

function createPrismaClient() {
  if (process.env.NODE_ENV === "test") {
    return createTestClient()
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export type PrismaTransaction = Parameters<PrismaClient["$transaction"]>[0]
