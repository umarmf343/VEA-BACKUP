import { type NextRequest, NextResponse } from "next/server"
import {
  applyAdminOverride,
  getReportCard,
  listReportCards,
  saveCompleteReportCard,
  submitSubjectAssessment,
  updateReportCardStatus,
} from "@/lib/report-card-service"
import type { ReportCardStatus } from "@/lib/report-card-types"

export const runtime = "nodejs"

function parseStatus(value: unknown): ReportCardStatus | undefined {
  if (typeof value !== "string") return undefined
  const statuses: ReportCardStatus[] = ["draft", "submitted", "approved", "revoked", "published"]
  return statuses.find((status) => status === value) || undefined
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const term = searchParams.get("term")
    const session = searchParams.get("session")

    if (studentId) {
      if (!term || !session) {
        return NextResponse.json(
          { error: "term and session query parameters are required when requesting a student report card" },
          { status: 400 },
        )
      }

      const reportCard = await getReportCard(studentId, term, session)
      if (!reportCard) {
        return NextResponse.json({ error: "Report card not found" }, { status: 404 })
      }

      return NextResponse.json({ data: reportCard })
    }

    const filters = {
      status: parseStatus(searchParams.get("status")),
      className: searchParams.get("className") || undefined,
      term: searchParams.get("term") || undefined,
      session: searchParams.get("session") || undefined,
    }

    const reportCards = await listReportCards(filters)
    return NextResponse.json({ data: reportCards })
  } catch (error) {
    console.error("Failed to fetch report cards", error)
    return NextResponse.json({ error: "Failed to fetch report cards" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === "subject-assessment") {
      const reportCard = await submitSubjectAssessment({
        studentId: body.student?.id || body.studentId,
        studentName: body.student?.name || body.studentName,
        admissionNumber: body.student?.admissionNumber || body.admissionNumber,
        className: body.student?.class || body.className,
        subject: body.subject,
        ca1: Number(body.ca1 || 0),
        ca2: Number(body.ca2 || 0),
        assignment: Number(body.assignment || 0),
        exam: Number(body.exam || 0),
        remarks: body.remarks,
        term: body.term,
        session: body.session,
        teacherId: body.teacher?.id || body.teacherId,
        teacherName: body.teacher?.name || body.teacherName,
        status: parseStatus(body.status),
      })

      return NextResponse.json({ data: reportCard })
    }

    if (!body.student) {
      return NextResponse.json({ error: "Student payload is required" }, { status: 400 })
    }

    const reportCard = await saveCompleteReportCard({
      studentId: body.student.id,
      studentName: body.student.name,
      admissionNumber: body.student.admissionNumber,
      className: body.student.class,
      term: body.term,
      session: body.session,
      teacherId: body.teacher?.id || body.teacherId,
      teacherName: body.teacher?.name || body.teacherName,
      subjects: (body.subjects || []).map((subject: any) => ({
        name: subject.name,
        ca1: Number(subject.ca1 || 0),
        ca2: Number(subject.ca2 || 0),
        assignment: Number(subject.assignment || 0),
        exam: Number(subject.exam || 0),
        remarks: subject.remarks,
      })),
      affectiveDomain: body.affectiveDomain,
      psychomotorDomain: body.psychomotorDomain,
      classTeacherRemarks: body.classTeacherRemarks,
      status: parseStatus(body.status),
      metadata: body.metadata,
    })

    return NextResponse.json({ data: reportCard })
  } catch (error) {
    console.error("Failed to save report card", error)
    return NextResponse.json({ error: "Failed to save report card" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    if (body.action === "override") {
      if (!body.studentId || !body.term || !body.session || !body.adminId || !body.reason) {
        return NextResponse.json(
          { error: "studentId, term, session, adminId and reason are required for overrides" },
          { status: 400 },
        )
      }

      const reportCard = await applyAdminOverride({
        studentId: body.studentId,
        term: body.term,
        session: body.session,
        overrides: body.overrides || {},
        adminId: body.adminId,
        reason: body.reason,
      })

      return NextResponse.json({ data: reportCard })
    }

    if (!body.studentId || !body.term || !body.session || !body.status) {
      return NextResponse.json(
        { error: "studentId, term, session and status are required" },
        { status: 400 },
      )
    }

    const reportCard = await updateReportCardStatus({
      studentId: body.studentId,
      term: body.term,
      session: body.session,
      status: parseStatus(body.status) || "submitted",
      message: body.message,
      actorId: body.actorId,
      actorRole: body.actorRole,
    })

    return NextResponse.json({ data: reportCard })
  } catch (error) {
    console.error("Failed to update report card status", error)
    return NextResponse.json({ error: "Failed to update report card" }, { status: 500 })
  }
}
