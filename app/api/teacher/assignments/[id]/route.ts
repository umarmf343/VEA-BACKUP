import { NextResponse } from "next/server";

import { updateTeacherAssignment } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const assignmentId = params.id;
    if (!assignmentId) {
      return NextResponse.json({ error: "Assignment id is required." }, { status: 400 });
    }

    const payload = await request.json();
    const updates: Record<string, unknown> = payload ?? {};

    const ALLOWED_STATUSES = ["pending", "submitted", "graded", "returned"] as const;
    type AllowedStatus = (typeof ALLOWED_STATUSES)[number];
    const status =
      typeof updates.status === "string" && (ALLOWED_STATUSES as readonly string[]).includes(updates.status)
        ? (updates.status as AllowedStatus)
        : undefined;

    const result = updateTeacherAssignment(assignmentId, {
      status,
      submissionsPending:
        typeof updates.submissionsPending === "number" ? Number(updates.submissionsPending) : undefined,
      submissionsGraded:
        typeof updates.submissionsGraded === "number" ? Number(updates.submissionsGraded) : undefined,
      description: typeof updates.description === "string" ? updates.description : undefined,
      dueDate: typeof updates.dueDate === "string" ? updates.dueDate : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    return NextResponse.json({ assignment: result });
  } catch (error) {
    console.error("Failed to update teacher assignment", error);
    return NextResponse.json({ error: "Failed to update assignment." }, { status: 500 });
  }
}
