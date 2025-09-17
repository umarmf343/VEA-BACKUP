import { NextRequest, NextResponse } from "next/server";

import { updateParentNotification } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const notification = updateParentNotification(params.id, { status: body?.status });
    return NextResponse.json(notification);
  } catch (error: any) {
    console.error("Failed to update parent notification", error);
    return NextResponse.json({ error: error?.message ?? "Unable to update notification." }, { status: 400 });
  }
}
