import { NextResponse } from "next/server";

import { updateTeacherAssessment } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const assessmentId = params.id;
    if (!assessmentId) {
      return NextResponse.json({ error: "Assessment id is required." }, { status: 400 });
    }

    const payload = await request.json();
    const updates: Record<string, unknown> = payload ?? {};

    const result = updateTeacherAssessment(assessmentId, {
      status: typeof updates.status === "string" ? (updates.status as any) : undefined,
      remarks: typeof updates.remarks === "string" ? updates.remarks : undefined,
    });

    if (!result) {
      return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
    }

    return NextResponse.json({ assessment: result });
  } catch (error) {
    console.error("Failed to update teacher assessment", error);
    return NextResponse.json({ error: "Failed to update assessment." }, { status: 500 });
  }
}
