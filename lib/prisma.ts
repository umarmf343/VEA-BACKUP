import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { PrismaClient as PrismaClientType } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientType
}

function createTestClient(): PrismaClientType {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require("pg-mem")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaPg } = require("@prisma/adapter-pg")
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require("@prisma/client/edge")

  const db = newDb()
  const adapter = new PrismaPg(db.adapters.createPg())
  const migrationPath = join(process.cwd(), "prisma/migrations/20241011000000_init/migration.sql")
  const sql = readFileSync(migrationPath, "utf8")
  db.public.none(sql)

  return new PrismaClient({ adapter, log: ["error"] }) as unknown as PrismaClientType
}

function createStandardClient(): PrismaClientType {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client")

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }) as PrismaClientType
}

function createPrismaClient(): PrismaClientType {
  if (process.env.NODE_ENV === "test") {
    return createTestClient()
  }

  return createStandardClient()
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export type PrismaTransaction = Parameters<PrismaClientType["$transaction"]>[0]
