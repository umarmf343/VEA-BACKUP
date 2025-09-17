import { type NextRequest, NextResponse } from "next/server"
import { marksSchema } from "@/lib/validation-schemas"
import { verifyToken } from "@/lib/security"
import { getReportCard, submitSubjectAssessment } from "@/lib/report-card-service"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = marksSchema.parse(body)

    const authHeader = request.headers.get("authorization")
    let actor: { userId: string; role: string; name?: string } = {
      userId: body.teacherId || "teacher",
      role: "Teacher",
      name: body.teacherName,
    }

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      try {
        const decoded = verifyToken(token)
        actor = {
          userId: decoded.userId || decoded.id || actor.userId,
          role: decoded.role || actor.role,
          name: decoded.name || actor.name,
        }
      } catch (error) {
        console.warn("Invalid token supplied for marks submission", error)
      }
    }

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
    console.error("Marks save error:", error)
    return NextResponse.json({ error: "Failed to save marks" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
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

    const reportCard = await getReportCard(studentId, term, session)

    if (!reportCard) {
      return NextResponse.json({ error: "No marks found for the requested student" }, { status: 404 })
    }

    return NextResponse.json({
      data: reportCard.subjects,
      reportCard,
    })
  } catch (error) {
    console.error("Marks fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch marks" }, { status: 500 })
  }
}
