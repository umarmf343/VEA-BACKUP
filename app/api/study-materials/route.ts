// app/api/study-materials/route.ts
// Purpose: Return the list of study materials.
// Used by: components/study-materials.tsx (GET /api/study-materials)
//
// Behavior:
// - Dev-safe in-memory list (shared across hot reloads via globalThis).
// - Optional search: /api/study-materials?q=<text>
// - Sorted by uploadedAt (newest first).
//
// Production:
// - Replace ensureDB() with real persistence (DB/storage).
// - Populate url with your object storage/public URL.

import { NextResponse } from "next/server";

export type MaterialItem = {
  id: string;
  filename: string;
  url: string;
  size?: number;       // bytes
  uploadedAt?: string; // ISO timestamp
};

function ensureDB(): MaterialItem[] {
  const g = globalThis as unknown as { _MATERIALS?: MaterialItem[] };
  if (!g._MATERIALS) {
    const now = Date.now();
    g._MATERIALS = [
      {
        id: "mat_001",
        filename: "Welcome-Pack.pdf",
        url: "/files/welcome-pack.pdf",
        size: 245_760,
        uploadedAt: new Date(now - 2 * 86_400_000).toISOString(),
      },
      {
        id: "mat_002",
        filename: "Term1-Timetable.xlsx",
        url: "/files/term1-timetable.xlsx",
        size: 61_440,
        uploadedAt: new Date(now - 1 * 86_400_000).toISOString(),
      },
      {
        id: "mat_003",
        filename: "Chemistry-Notes-Intro.docx",
        url: "/files/chemistry-notes-intro.docx",
        size: 98_304,
        uploadedAt: new Date(now - 6 * 3_600_000).toISOString(),
      },
    ];
  }
  return g._MATERIALS!;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase().trim();

  const db = ensureDB();
  let items = [...db];

  if (q) {
    items = items.filter((it) => it.filename.toLowerCase().includes(q));
  }

  items.sort((a, b) => {
    const at = a.uploadedAt ? Date.parse(a.uploadedAt) : 0;
    const bt = b.uploadedAt ? Date.parse(b.uploadedAt) : 0;
    return bt - at;
  });

  return NextResponse.json(items, { status: 200 });
}
