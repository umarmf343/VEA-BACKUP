import { NextRequest, NextResponse } from "next/server";

import { appendParentSupportMessage, setParentSupportStatus } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (body?.status) {
      const thread = setParentSupportStatus(params.id, body.status);
      return NextResponse.json(thread);
    }

    if (body?.body) {
      const thread = appendParentSupportMessage(params.id, { body: body.body });
      return NextResponse.json(thread);
    }

    return NextResponse.json({ error: "No updates provided." }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to update parent support thread", error);
    return NextResponse.json({ error: error?.message ?? "Unable to update support thread." }, { status: 400 });
  }
}
