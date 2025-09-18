export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { dbManager } from "@/lib/database-manager"
import {
  assignmentCreateSchema,
  assignmentSubmissionSchema,
  formatZodErrors,
} from "@/lib/validation-schemas"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get("teacherId")
    const studentId = searchParams.get("studentId")
    const classId = searchParams.get("classId")

    const assignments = await dbManager.getAssignments({
      teacherId: teacherId || undefined,
      studentId: studentId || undefined,
      classId: classId || undefined,
    })

    return NextResponse.json({ assignments })
  } catch (error) {
    console.error("Failed to fetch assignments:", error)
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)

    if (body && typeof body === "object" && (body as { type?: unknown }).type === "submission") {
      const validation = assignmentSubmissionSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          {
            error: "Invalid assignment submission",
            fieldErrors: formatZodErrors(validation.error),
          },
          { status: 400 },
        )
      }

      const { assignmentId, studentId, files } = validation.data

      const submission = await dbManager.createAssignmentSubmission({
        assignmentId,
        studentId,
        files: files ?? [],
        status: "submitted",
      })

      return NextResponse.json({
        submission,
        message: "Assignment submitted successfully",
      })
    }

    const validation = assignmentCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid assignment data",
          fieldErrors: formatZodErrors(validation.error),
        },
        { status: 400 },
      )
    }

    const { status, ...assignmentData } = validation.data

    const newAssignment = await dbManager.createAssignment({
      ...assignmentData,
      status: status ?? "active",
    })

    return NextResponse.json({
      assignment: newAssignment,
      message: "Assignment created successfully",
    })
  } catch (error) {
    console.error("Failed to process assignment:", error)
    return NextResponse.json({ error: "Failed to process assignment" }, { status: 500 })
  }
}
