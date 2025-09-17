import { type NextRequest, NextResponse } from "next/server"

import { requireAuth, isHttpError } from "@/lib/api-auth"
import { getReportCard, submitSubjectAssessment } from "@/lib/report-card-service"
import { hasPermission } from "@/lib/security"
import { marksSchema } from "@/lib/validation-schemas"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const actor = requireAuth(request)

    if (!hasPermission(actor.role, ["Teacher", "Admin", "Super Admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = marksSchema.parse(body)

    const reportCard = await submitSubjectAssessment({
      studentId: validatedData.studentId,
      studentName: body.studentName || `Student ${validatedData.studentId}`,
      admissionNumber: body.admissionNumber,
      className: body.className || body.class || "Unknown Class",
      subject: validatedData.subject,
      ca1: validatedData.ca1,
      ca2: validatedData.ca2,
      assignment: validatedData.assignment,
      exam: validatedData.exam,
      remarks: validatedData.remarks,
      term: validatedData.term,
      session: validatedData.session,
      teacherId: actor.userId,
      teacherName: actor.name || body.teacherName,
      status: body.status,
    })

    return NextResponse.json({
      message: "Marks saved successfully",
      data: reportCard,
    })
  } catch (error) {
    if (isHttpError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Marks save error:", error)
    return NextResponse.json({ error: "Failed to save marks" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request)

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const term = searchParams.get("term")
    const session = searchParams.get("session")

    if (!studentId || !term || !session) {
      return NextResponse.json(
        { error: "studentId, term and session query parameters are required" },
        { status: 400 },
      )
    }

    if (actor.role === "Student" && actor.userId !== studentId) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    if (actor.role !== "Student" && !hasPermission(actor.role, ["Teacher", "Admin", "Super Admin"])) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const reportCard = await getReportCard(studentId, term, session)

    if (!reportCard) {
      return NextResponse.json({ error: "No marks found for the requested student" }, { status: 404 })
    }

    return NextResponse.json({
      data: reportCard.subjects,
      reportCard,
    })
  } catch (error) {
    if (isHttpError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Marks fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch marks" }, { status: 500 })
  }
}
