import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { StudentPaymentStatus, StudentStatus } from "@prisma/client"

import { studentRepository, classRepository } from "@/lib/repositories"

function mapStudent(student: Awaited<ReturnType<typeof studentRepository.findStudentById>>) {
  if (!student) return null
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    classId: student.classId,
    class: student.class?.name ?? "",
    section: student.section ?? "",
    admissionNumber: student.admissionNumber,
    parentName: student.parentName ?? "",
    parentEmail: student.parentEmail ?? "",
    paymentStatus:
      student.paymentStatus === StudentPaymentStatus.PAID
        ? "paid"
        : student.paymentStatus === StudentPaymentStatus.OVERDUE
          ? "overdue"
          : "pending",
    status: student.status === StudentStatus.INACTIVE ? "inactive" : "active",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : null,
    address: student.address ?? "",
    phone: student.phone ?? "",
    guardianPhone: student.guardianPhone ?? "",
    bloodGroup: student.bloodGroup ?? "",
    admissionDate: student.admissionDate ? student.admissionDate.toISOString() : null,
    subjects: Array.isArray(student.subjects) ? (student.subjects as string[]) : [],
    attendance:
      student.attendance && typeof student.attendance === "object"
        ? (student.attendance as { present: number; total: number })
        : { present: 0, total: 0 },
    grades: Array.isArray(student.grades) ? (student.grades as any[]) : [],
    photoUrl: student.photoUrl ?? null,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const classId = searchParams.get("classId")

  if (classId && classId !== "all") {
    const klass = await classRepository.findClassById(classId).catch(() => null)
    if (!klass) {
      return NextResponse.json({ students: [] })
    }
    const students = await studentRepository.findStudentsByClass(klass.id)
    return NextResponse.json({ students: students.map((student) => mapStudent(student)) })
  }

  const students = await studentRepository.listStudents()
  return NextResponse.json({ students: students.map((student) => mapStudent(student)) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    name,
    email,
    classId,
    class: className,
    section,
    admissionNumber,
    parentName,
    parentEmail,
    paymentStatus,
    status,
    ...rest
  } = body

  let classRecord = null
  if (classId) {
    classRecord = await classRepository.findClassById(classId)
  } else if (className) {
    classRecord = (await classRepository.findClassByName(className)) ?? null
    if (!classRecord) {
      classRecord = await classRepository.createClass({ name: className })
    }
  }

  const created = await studentRepository.createStudent({
    name,
    email,
    classId: classRecord?.id,
    section,
    admissionNumber,
    parentName,
    parentEmail,
    paymentStatus:
      paymentStatus === "paid"
        ? StudentPaymentStatus.PAID
        : paymentStatus === "overdue"
          ? StudentPaymentStatus.OVERDUE
          : StudentPaymentStatus.PENDING,
    status: status === "inactive" ? StudentStatus.INACTIVE : StudentStatus.ACTIVE,
    ...rest,
  })

  return NextResponse.json({ student: mapStudent(created) })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const { id, classId, class: className, paymentStatus, status, ...updates } = body

  let resolvedClassId: string | null | undefined = classId
  if (!resolvedClassId && className) {
    const klass = (await classRepository.findClassByName(className)) ?? (await classRepository.createClass({ name: className }))
    resolvedClassId = klass?.id
  }

  const updated = await studentRepository.updateStudent(id, {
    ...updates,
    classId: resolvedClassId,
    paymentStatus:
      paymentStatus === undefined
        ? undefined
        : paymentStatus === "paid"
          ? StudentPaymentStatus.PAID
          : paymentStatus === "overdue"
            ? StudentPaymentStatus.OVERDUE
            : StudentPaymentStatus.PENDING,
    status:
      status === undefined
        ? undefined
        : status === "inactive"
          ? StudentStatus.INACTIVE
          : StudentStatus.ACTIVE,
  })

  return NextResponse.json({ student: mapStudent(updated) })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  if (!id) {
    return NextResponse.json({ error: "Student id is required" }, { status: 400 })
  }

  const deleted = await studentRepository.deleteStudent(id)
  return NextResponse.json({ student: mapStudent(deleted) })
}
