import type { Prisma, User, UserRole } from "@prisma/client"
import { UserStatus } from "@prisma/client"

import { prisma } from "../prisma"

export type CreateUserInput = {
  name: string
  email: string
  role: UserRole
  passwordHash?: string | null
  status?: UserStatus
  metadata?: Prisma.JsonValue
}

export type UpdateUserInput = Partial<CreateUserInput>

export async function listUsers(role?: UserRole) {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    orderBy: { createdAt: "desc" },
  })
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } })
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function createUser(data: CreateUserInput) {
  return prisma.user.create({
    data: {
      ...data,
      status: data.status ?? UserStatus.ACTIVE,
    },
  })
}

export async function updateUser(id: string, data: UpdateUserInput) {
  return prisma.user.update({
    where: { id },
    data,
  })
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } })
}

export type UserWithRelations = User
