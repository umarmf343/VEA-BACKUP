import { NextResponse } from "next/server";

import { createStudentSupportRequest, listStudentSupportRequests } from "@/lib/student-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const requests = listStudentSupportRequests();
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Failed to load student support requests", error);
    return NextResponse.json({ error: "Failed to load support requests." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const topic = typeof payload?.topic === "string" ? payload.topic.trim() : "";
    const description = typeof payload?.description === "string" ? payload.description.trim() : "";

    if (!topic) {
      return NextResponse.json({ error: "Topic is required." }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }

    const requestRecord = createStudentSupportRequest({ topic, description });
    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    console.error("Failed to create student support request", error);
    return NextResponse.json({ error: "Failed to create support request." }, { status: 500 });
  }
}
