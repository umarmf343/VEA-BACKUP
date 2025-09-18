import { prisma } from "../prisma"
import { toJsonOptional } from "./utils"

export type CreateAuditLogInput = {
  actorId?: string | null
  action: string
  entity: string
  entityId?: string | null
  details?: unknown
}

export async function recordAuditLog(data: CreateAuditLogInput) {
  const { actorId, details, ...rest } = data

  return prisma.auditLog.create({
    data: {
      ...rest,
      details: toJsonOptional(details),
      actor: actorId ? { connect: { id: actorId } } : undefined,
    },
  })
}

export async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: true },
  })
}
