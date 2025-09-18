import type {
  AssignmentStatus,
  Prisma,
  SubmissionStatus,
} from "@prisma/client"
import { AssignmentStatus as AssignmentStatusEnum, SubmissionStatus as SubmissionStatusEnum } from "@prisma/client"

import { prisma } from "../prisma"

export type AssignmentFilters = {
  classId?: string
  teacherId?: string
  status?: AssignmentStatus
}

export type CreateAssignmentInput = {
  title: string
  description: string
  subject: string
  classId: string
  teacherId: string
  dueDate: string | Date
  status?: AssignmentStatus
}

export type CreateSubmissionInput = {
  assignmentId: string
  studentId: string
  files?: string[]
  status?: SubmissionStatus
  submittedAt?: string | Date | null
  grade?: string | null
  feedback?: string | null
}

export async function listAssignments(filters: AssignmentFilters = {}) {
  const { classId, teacherId, status } = filters
  return prisma.assignment.findMany({
    where: {
      classId: classId ?? undefined,
      teacherId: teacherId ?? undefined,
      status: status ?? undefined,
    },
    include: { class: true, teacher: true, submissions: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function createAssignment(data: CreateAssignmentInput) {
  return prisma.assignment.create({
    data: {
      title: data.title,
      description: data.description,
      subject: data.subject,
      class: { connect: { id: data.classId } },
      teacher: { connect: { id: data.teacherId } },
      dueDate: new Date(data.dueDate),
      status: data.status ?? AssignmentStatusEnum.ACTIVE,
    },
    include: { class: true, teacher: true, submissions: true },
  })
}

export async function createSubmission(data: CreateSubmissionInput) {
  return prisma.assignmentSubmission.create({
    data: {
      assignment: { connect: { id: data.assignmentId } },
      student: { connect: { id: data.studentId } },
      files: data.files ?? [],
      status: data.status ?? SubmissionStatusEnum.PENDING,
      submittedAt: data.submittedAt ? new Date(data.submittedAt) : undefined,
      grade: data.grade ?? undefined,
      feedback: data.feedback ?? undefined,
    },
    include: { assignment: true, student: true },
  })
}

export async function listSubmissions(assignmentId: string) {
  return prisma.assignmentSubmission.findMany({
    where: { assignmentId },
    include: { student: true },
    orderBy: { submittedAt: "desc" },
  })
}
