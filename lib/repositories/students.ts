import type { Prisma, Student, StudentPaymentStatus, StudentStatus } from "@prisma/client"
import { StudentPaymentStatus as PaymentStatusEnum, StudentStatus as StatusEnum } from "@prisma/client"

import { prisma } from "../prisma"
import { toDate, toJsonOptional } from "./utils"

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
  subjects?: unknown
  attendance?: unknown
  grades?: unknown
  photoUrl?: string | null
  metadata?: unknown
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
    metadata,
    ...rest
  } = data

  return {
    ...rest,
    class: classId ? { connect: { id: classId } } : undefined,
    dateOfBirth: toDate(dateOfBirth),
    admissionDate: toDate(admissionDate),
    paymentStatus: paymentStatus ?? PaymentStatusEnum.PENDING,
    status: status ?? StatusEnum.ACTIVE,
    subjects: toJsonOptional(subjects),
    attendance: toJsonOptional(attendance),
    grades: toJsonOptional(grades),
    metadata: toJsonOptional(metadata),
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
  if (data.metadata !== undefined) result.metadata = toJsonOptional(data.metadata)

  if (data.classId !== undefined) {
    result.class =
      data.classId === null ? { disconnect: true } : { connect: { id: data.classId } }
  }

  if (data.dateOfBirth !== undefined) {
    result.dateOfBirth = toDate(data.dateOfBirth)
  }

  if (data.admissionDate !== undefined) {
    result.admissionDate = toDate(data.admissionDate)
  }

  if (data.paymentStatus !== undefined) {
    result.paymentStatus = data.paymentStatus
  }

  if (data.status !== undefined) {
    result.status = data.status
  }

  if (data.subjects !== undefined) {
    result.subjects = toJsonOptional(data.subjects)
  }

  if (data.attendance !== undefined) {
    result.attendance = toJsonOptional(data.attendance)
  }

  if (data.grades !== undefined) {
    result.grades = toJsonOptional(data.grades)
  }

  return result
}

type StudentWithClass = Prisma.StudentGetPayload<{ include: { class: true } }>

export async function listStudents(): Promise<StudentWithClass[]> {
  const students = await prisma.student.findMany({
    include: { class: true },
    orderBy: { createdAt: "desc" },
  })

  return students
}

export async function findStudentById(id: string): Promise<StudentWithClass | null> {
  return prisma.student.findUnique({
    where: { id },
    include: { class: true },
  })
}

export async function findStudentsByClass(classId: string): Promise<StudentWithClass[]> {
  return prisma.student.findMany({
    where: { classId },
    include: { class: true },
    orderBy: { name: "asc" },
  })
}

export async function createStudent(data: CreateStudentInput): Promise<StudentWithClass> {
  return prisma.student.create({
    data: toCreateData(data),
    include: { class: true },
  })
}

export async function updateStudent(id: string, data: UpdateStudentInput): Promise<StudentWithClass> {
  return prisma.student.update({
    where: { id },
    data: toUpdateData(data),
    include: { class: true },
  })
}

export async function deleteStudent(id: string): Promise<StudentWithClass> {
  await prisma.assignmentSubmission.deleteMany({ where: { studentId: id } })
  await prisma.payment.deleteMany({ where: { studentId: id } })
  return prisma.student.delete({
    where: { id },
    include: { class: true },
  })
}

export type StudentWithRelations = StudentWithClass
