import { NextResponse } from "next/server";

import { listTeacherMessages, sendTeacherMessage } from "@/lib/teacher-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await listTeacherMessages();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to load teacher messages", error);
    return NextResponse.json({ error: "Failed to load messages." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { subject, body, recipients } = payload ?? {};

    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "subject is required." }, { status: 400 });
    }
    if (!body || typeof body !== "string") {
      return NextResponse.json({ error: "body is required." }, { status: 400 });
    }
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "recipients is required." }, { status: 400 });
    }

    const message = await sendTeacherMessage({
      subject: subject.trim(),
      body: body.trim(),
      recipients: recipients.map((recipient: string) => String(recipient).trim()).filter(Boolean),
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to send teacher message", error);
    return NextResponse.json({ error: "Failed to send message." }, { status: 500 });
  }
}
