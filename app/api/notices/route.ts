// app/api/notices/route.ts
// Purpose: Create and list notices.
// Used by: components/noticeboard.tsx (GET/POST /api/notices)
//
// Behavior (dev/mock):
// - In-memory list shared via globalThis (survives hot reloads in dev).
// - GET: returns notices sorted by createdAt desc.
// - POST: accepts JSON { title, body } -> creates a notice and returns it.
//
// Production:
// - Replace ensureDB() with real persistence.
// - Add auth/role checks in middleware or here if needed.

import { NextResponse } from "next/server";

export type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
};

function ensureDB(): Notice[] {
  const g = globalThis as unknown as { _NOTICES?: Notice[] };
  if (!g._NOTICES) {
    g._NOTICES = [
      {
        id: "ntc_001",
        title: "Welcome to the Portal",
        body: "Please complete your profile and check the noticeboard regularly.",
        createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      },
      {
        id: "ntc_002",
        title: "Midterm Exams",
        body: "Midterm exams start next Monday. Check the timetable.",
        createdAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
      },
    ];
  }
  return g._NOTICES!;
}

function uid(prefix: string) {
  const core =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${core}`.replace(/-/g, "");
}

export async function GET() {
  const db = ensureDB();
  const items = [...db].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json(items, { status: 200 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title ?? "").trim();
    const text = String(body?.body ?? "").trim();

    if (!title || !text) {
      return NextResponse.json(
        { message: "Both title and body are required." },
        { status: 400 }
      );
    }

    const db = ensureDB();
    const notice: Notice = {
      id: uid("ntc"),
      title,
      body: text,
      createdAt: new Date().toISOString(),
    };
    db.push(notice);

    return NextResponse.json(notice, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to create notice." },
      { status: 500 }
    );
  }
}
