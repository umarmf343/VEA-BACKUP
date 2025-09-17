import { NextRequest, NextResponse } from "next/server";

import { createParentSupportThread, listParentSupportThreads } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const threads = listParentSupportThreads();
    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Failed to load parent support threads", error);
    return NextResponse.json({ error: "Unable to load support threads." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const thread = createParentSupportThread({
      subject: body?.subject,
      body: body?.body,
      studentId: body?.studentId ?? undefined,
    });
    return NextResponse.json(thread, { status: 201 });
  } catch (error: any) {
    console.error("Failed to create parent support thread", error);
    return NextResponse.json({ error: error?.message ?? "Unable to create support request." }, { status: 400 });
  }
}
