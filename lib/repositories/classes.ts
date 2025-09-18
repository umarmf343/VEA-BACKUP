import type { ClassStatus, Prisma } from "@prisma/client"
import { ClassStatus as ClassStatusEnum } from "@prisma/client"

import { prisma } from "../prisma"

export type CreateClassInput = {
  name: string
  level?: string | null
  section?: string | null
  capacity?: number | null
  status?: ClassStatus
  subjects?: Prisma.JsonValue
  teacherId?: string | null
}

export type UpdateClassInput = Partial<CreateClassInput>

export async function listClasses() {
  return prisma.class.findMany({
    include: { teacher: true, students: true },
    orderBy: { name: "asc" },
  })
}

export async function findClassById(id: string) {
  return prisma.class.findUnique({ where: { id }, include: { teacher: true, students: true } })
}

export async function findClassByName(name: string) {
  return prisma.class.findFirst({ where: { name }, include: { teacher: true, students: true } })
}

export async function createClass(data: CreateClassInput) {
  const { teacherId, subjects, status, ...rest } = data
  return prisma.class.create({
    data: {
      ...rest,
      subjects: subjects ?? undefined,
      status: status ?? ClassStatusEnum.ACTIVE,
      teacher: teacherId ? { connect: { id: teacherId } } : undefined,
    },
    include: { teacher: true, students: true },
  })
}

export async function updateClass(id: string, data: UpdateClassInput) {
  const { teacherId, subjects, status, ...rest } = data
  return prisma.class.update({
    where: { id },
    data: {
      ...rest,
      subjects: subjects ?? undefined,
      status: status ?? undefined,
      teacher:
        teacherId !== undefined
          ? teacherId === null
            ? { disconnect: true }
            : { connect: { id: teacherId } }
          : undefined,
    },
    include: { teacher: true, students: true },
  })
}

export async function deleteClass(id: string) {
  await prisma.assignment.deleteMany({ where: { classId: id } })
  await prisma.student.updateMany({ where: { classId: id }, data: { classId: null } })
  return prisma.class.delete({ where: { id } })
}
