// app/api/study-materials/upload/route.ts
// Purpose: Accept file upload (FormData: field "file") and add it to the materials list.
// Used by: components/study-materials.tsx (POST /api/study-materials/upload)
//
// Behavior (dev/mock):
// - Reads file from multipart/form-data without saving to disk (no storage).
// - Appends a record to the same in-memory array used by GET /api/study-materials.
// - Returns the created item.
//
// Production notes:
// - Replace the mock with real storage (e.g., S3/Cloudinary/Drive) and persist metadata to DB.
// - The returned `url` should be the public URL where the file can be downloaded.

import { NextResponse } from "next/server";

export type MaterialItem = {
  id: string;
  filename: string;
  url: string;
  size?: number;
  uploadedAt?: string;
};

function ensureDB(): MaterialItem[] {
  const g = globalThis as unknown as { _MATERIALS?: MaterialItem[] };
  if (!g._MATERIALS) g._MATERIALS = [];
  return g._MATERIALS!;
}

function uid(prefix: string) {
  const core =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${core}`.replace(/-/g, "");
}

const MAX_MB = 50;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ message: "Missing file." }, { status: 400 });
    }

    const size = typeof file.size === "number" ? file.size : 0;
    if (size > MAX_MB * 1024 * 1024) {
      return NextResponse.json(
        { message: `File too large. Max ${MAX_MB} MB.` },
        { status: 413 }
      );
    }

    const filename = file.name || "unnamed";
    const id = uid("mat");
    const uploadedAt = new Date().toISOString();

    // DEV MOCK: We don't actually store bytes anywhere.
    // Use a placeholder URL; in production, upload to storage and set the public URL here.
    const url = `/files/${encodeURIComponent(filename)}`;

    const item: MaterialItem = { id, filename, url, size, uploadedAt };
    const db = ensureDB();
    db.push(item);

    return NextResponse.json(item, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Upload failed." },
      { status: 500 }
    );
  }
}
