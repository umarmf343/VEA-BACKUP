export const runtime = "nodejs"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { assignmentRepository } from "@/lib/repositories"

function mapAssignment(assignment: Awaited<ReturnType<typeof assignmentRepository.listAssignments>>[number]) {
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    subject: assignment.subject,
    classId: assignment.classId,
    teacherId: assignment.teacherId,
    dueDate: assignment.dueDate.toISOString(),
    status: assignment.status === "CLOSED" ? "closed" : "active",
    createdAt: assignment.createdAt.toISOString(),
  }
}

function mapSubmission(submission: Awaited<ReturnType<typeof assignmentRepository.createSubmission>>) {
  return {
    id: submission.id,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    files: submission.files ?? [],
    status:
      submission.status === "GRADED"
        ? "graded"
        : submission.status === "SUBMITTED"
          ? "submitted"
          : "pending",
    submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : new Date().toISOString(),
    grade: submission.grade ?? null,
    feedback: submission.feedback ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")
    const studentId = searchParams.get("studentId")
    const classId = searchParams.get("classId")

    const filters: { teacherId?: string; studentId?: string; classId?: string } = {}

    if (teacherId) filters.teacherId = teacherId
    if (classId) filters.classId = classId
    if (studentId) filters.studentId = studentId

    const assignments = await assignmentRepository.listAssignments(filters)
    return NextResponse.json({ assignments: assignments.map(mapAssignment) })
  } catch (error) {
    console.error("Failed to fetch assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, subject, classId, teacherId, dueDate, type } = body

    if (type === "submission") {
      const { assignmentId, studentId, files } = body

      const submission = await assignmentRepository.createSubmission({
        assignmentId,
        studentId,
        files: files || [],
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
      })

      return NextResponse.json({
        submission: mapSubmission(submission),
        message: "Assignment submitted successfully",
      })
    } else {
      if (!classId) {
        return NextResponse.json({ error: "Class identifier is required" }, { status: 400 })
      }

      const newAssignment = await assignmentRepository.createAssignment({
        title,
        description,
        subject,
        classId,
        teacherId,
        dueDate,
        status: "ACTIVE",
      })

      return NextResponse.json({
        assignment: mapAssignment(newAssignment),
        message: "Assignment created successfully",
      })
    }
  } catch (error) {
    console.error("Failed to process assignment:", error)
    return NextResponse.json({ error: "Failed to process assignment" }, { status: 500 })
  }
}
