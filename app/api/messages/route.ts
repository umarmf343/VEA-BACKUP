// app/api/messages/route.ts
// Purpose: List and send internal messages (dev/mock backend).
// Used by: components/internal-messaging.tsx
//
// Endpoints:
//   GET  /api/messages?peerId=<id>
//     - Optional header "x-user-id" to specify the current user id; defaults to "ME".
//     - Returns messages between <currentUser> and <peerId>, newest last.
//   POST /api/messages { to: string, body: string }
//     - Optional header "x-user-id" as the sender; defaults to "ME".
//     - Appends a message and returns it.
//
// Storage:
//   - Dev-safe in-memory array on globalThis (replace with real DB in production).

import { NextResponse } from "next/server";

export type Msg = {
  id: string;
  from: string;
  to: string;
  body: string;
  createdAt: string; // ISO
};

function ensureDB(): Msg[] {
  const g = globalThis as unknown as { _MSGS?: Msg[] };
  if (!g._MSGS) {
    const now = Date.now();
    g._MSGS = [
      {
        id: "msg_001",
        from: "ME",
        to: "admin",
        body: "Hello! I have a question about my fees.",
        createdAt: new Date(now - 3 * 60_000).toISOString(),
      },
      {
        id: "msg_002",
        from: "admin",
        to: "ME",
        body: "Hi! Sure, what do you need help with?",
        createdAt: new Date(now - 2 * 60_000).toISOString(),
      },
    ];
  }
  return g._MSGS!;
}

function uid(prefix: string) {
  const core =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${core}`.replace(/-/g, "");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const peerId = (url.searchParams.get("peerId") || "").trim();
  if (!peerId) {
    return NextResponse.json({ message: "Missing peerId" }, { status: 400 });
  }

  const me = (req.headers.get("x-user-id") || "ME").trim();
  const db = ensureDB();

  // Conversation is messages where either side is me and the other is peerId
  const conv = db
    .filter(
      (m) =>
        (m.from === me && m.to === peerId) ||
        (m.from === peerId && m.to === me)
    )
    .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)); // oldest first

  return NextResponse.json(conv, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const me = (req.headers.get("x-user-id") || "ME").trim();
    const payload = await req.json().catch(() => ({}));
    const to = String(payload?.to ?? "").trim();
    const body = String(payload?.body ?? "").trim();

    if (!to || !body) {
      return NextResponse.json(
        { message: "Both 'to' and 'body' are required." },
        { status: 400 }
      );
    }

    const msg: Msg = {
      id: uid("msg"),
      from: me,
      to,
      body,
      createdAt: new Date().toISOString(),
    };

    const db = ensureDB();
    db.push(msg);

    return NextResponse.json(msg, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to send message." },
      { status: 500 }
    );
  }
}
