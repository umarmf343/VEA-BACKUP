import { NextResponse } from "next/server";

import { updateStudentAssignment } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Assignment id is required." }, { status: 400 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const { status, progress, submissionLink, notes } = payload ?? {};

    const assignment = updateStudentAssignment(id, {
      status,
      progress,
      submissionLink,
      notes,
    });

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error(`Failed to update student assignment ${id}`, error);
    const message = error instanceof Error ? error.message : "Failed to update assignment.";
    const statusCode = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message || "Failed to update assignment." }, { status: statusCode });
  }
}
