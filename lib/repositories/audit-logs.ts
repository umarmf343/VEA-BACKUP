import type { Prisma } from "@prisma/client"

import { prisma } from "../prisma"

export type CreateAuditLogInput = {
  actorId?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: Prisma.JsonValue
}

export async function recordAuditLog(data: CreateAuditLogInput) {
  return prisma.auditLog.create({ data })
}

export async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: true },
  })
}
