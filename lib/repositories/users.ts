import type { User, UserRole } from "@prisma/client"
import { UserStatus } from "@prisma/client"

import { prisma } from "../prisma"
import { toJsonOptional } from "./utils"

export type CreateUserInput = {
  name: string
  email: string
  role: UserRole
  passwordHash?: string | null
  status?: UserStatus
  metadata?: unknown
}

export type UpdateUserInput = Partial<CreateUserInput>

export async function listUsers(role?: UserRole): Promise<User[]> {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    orderBy: { createdAt: "desc" },
  })
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } })
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } })
}

export async function createUser(data: CreateUserInput): Promise<User> {
  const { metadata, status, ...rest } = data

  return prisma.user.create({
    data: {
      ...rest,
      status: status ?? UserStatus.ACTIVE,
      metadata: toJsonOptional(metadata),
    },
  })
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  const { metadata, ...rest } = data

  return prisma.user.update({
    where: { id },
    data: {
      ...rest,
      metadata: toJsonOptional(metadata),
    },
  })
}

export async function deleteUser(id: string): Promise<User> {
  return prisma.user.delete({ where: { id } })
}

export type UserWithRelations = User
