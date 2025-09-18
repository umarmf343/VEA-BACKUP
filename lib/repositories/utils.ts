import { Prisma } from "@prisma/client"

type JsonNull = typeof Prisma.JsonNull

export type OptionalJsonInput = Prisma.InputJsonValue | JsonNull | undefined

export function toJsonRequired(value: unknown): Prisma.InputJsonValue | JsonNull {
  if (value === undefined || value === null) {
    return Prisma.JsonNull
  }

  return value as Prisma.InputJsonValue
}

export function toJsonOptional(value: unknown): OptionalJsonInput {
  if (value === undefined) {
    return undefined
  }

  return toJsonRequired(value)
}

export function toDate(value: string | Date | null | undefined) {
  if (value === undefined) return undefined
  if (value === null) return null
  return value instanceof Date ? value : new Date(value)
}
