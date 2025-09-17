import { NextResponse } from "next/server";

import { updateStudentSupportRequest } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = params?.id;
  if (!id) {
    return NextResponse.json({ error: "Support request id is required." }, { status: 400 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const { status, message } = payload ?? {};
    const requestRecord = updateStudentSupportRequest(id, { status, message });
    return NextResponse.json({ request: requestRecord });
  } catch (error) {
    console.error(`Failed to update student support request ${id}`, error);
    const message = error instanceof Error ? error.message : "Failed to update support request.";
    const statusCode = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message || "Failed to update support request." }, { status: statusCode });
  }
}
