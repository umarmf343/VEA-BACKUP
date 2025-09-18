import type { Prisma, Student, StudentPaymentStatus, StudentStatus } from "@prisma/client"
import { StudentPaymentStatus as PaymentStatusEnum, StudentStatus as StatusEnum } from "@prisma/client"

import { prisma } from "../prisma"

export type CreateStudentInput = {
  name: string
  email: string
  classId?: string | null
  section?: string | null
  admissionNumber: string
  parentName?: string | null
  parentEmail?: string | null
  paymentStatus?: StudentPaymentStatus
  status?: StudentStatus
  dateOfBirth?: string | Date | null
  address?: string | null
  phone?: string | null
  guardianPhone?: string | null
  bloodGroup?: string | null
  admissionDate?: string | Date | null
  subjects?: Prisma.JsonValue
  attendance?: Prisma.JsonValue
  grades?: Prisma.JsonValue
  photoUrl?: string | null
  metadata?: Prisma.JsonValue
}

export type UpdateStudentInput = Partial<CreateStudentInput>

function toCreateData(data: CreateStudentInput): Prisma.StudentCreateInput {
  const {
    classId,
    dateOfBirth,
    admissionDate,
    paymentStatus,
    status,
    subjects,
    attendance,
    grades,
    ...rest
  } = data

  return {
    ...rest,
    class: classId ? { connect: { id: classId } } : undefined,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    admissionDate: admissionDate ? new Date(admissionDate) : undefined,
    paymentStatus: paymentStatus ?? PaymentStatusEnum.PENDING,
    status: status ?? StatusEnum.ACTIVE,
    subjects: subjects ?? undefined,
    attendance: attendance ?? undefined,
    grades: grades ?? undefined,
  }
}

function toUpdateData(data: UpdateStudentInput): Prisma.StudentUpdateInput {
  const result: Prisma.StudentUpdateInput = {}

  if (data.name !== undefined) result.name = data.name
  if (data.email !== undefined) result.email = data.email
  if (data.section !== undefined) result.section = data.section
  if (data.admissionNumber !== undefined) result.admissionNumber = data.admissionNumber
  if (data.parentName !== undefined) result.parentName = data.parentName
  if (data.parentEmail !== undefined) result.parentEmail = data.parentEmail
  if (data.address !== undefined) result.address = data.address
  if (data.phone !== undefined) result.phone = data.phone
  if (data.guardianPhone !== undefined) result.guardianPhone = data.guardianPhone
  if (data.bloodGroup !== undefined) result.bloodGroup = data.bloodGroup
  if (data.photoUrl !== undefined) result.photoUrl = data.photoUrl
  if (data.metadata !== undefined) result.metadata = data.metadata

  if (data.classId !== undefined) {
    result.class =
      data.classId === null ? { disconnect: true } : { connect: { id: data.classId } }
  }

  if (data.dateOfBirth !== undefined) {
    result.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null
  }

  if (data.admissionDate !== undefined) {
    result.admissionDate = data.admissionDate ? new Date(data.admissionDate) : null
  }

  if (data.paymentStatus !== undefined) {
    result.paymentStatus = data.paymentStatus
  }

  if (data.status !== undefined) {
    result.status = data.status
  }

  if (data.subjects !== undefined) {
    result.subjects = data.subjects
  }

  if (data.attendance !== undefined) {
    result.attendance = data.attendance
  }

  if (data.grades !== undefined) {
    result.grades = data.grades
  }

  return result
}

export async function listStudents() {
  const students = await prisma.student.findMany({
    include: { class: true },
    orderBy: { createdAt: "desc" },
  })

  return students
}

export async function findStudentById(id: string) {
  return prisma.student.findUnique({
    where: { id },
    include: { class: true },
  })
}

export async function findStudentsByClass(classId: string) {
  return prisma.student.findMany({
    where: { classId },
    include: { class: true },
    orderBy: { name: "asc" },
  })
}

export async function createStudent(data: CreateStudentInput) {
  return prisma.student.create({
    data: toCreateData(data),
    include: { class: true },
  })
}

export async function updateStudent(id: string, data: UpdateStudentInput) {
  return prisma.student.update({
    where: { id },
    data: toUpdateData(data),
    include: { class: true },
  })
}

export async function deleteStudent(id: string) {
  await prisma.assignmentSubmission.deleteMany({ where: { studentId: id } })
  await prisma.payment.deleteMany({ where: { studentId: id } })
  return prisma.student.delete({ where: { id } })
}

export type StudentWithRelations = Student & { class: { id: string; name: string } | null }
