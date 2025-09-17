import { NextRequest, NextResponse } from "next/server";

import { recordAdminPasswordReset } from "@/lib/admin-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: string };
    if (!body?.id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 });
    }

    const user = recordAdminPasswordReset(body.id);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Admin user password reset error:", error);
    const message = error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
