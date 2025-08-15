// components/study-materials.tsx
// Purpose: Reliable upload & download of study materials with validation and clear UX.
// Fixes addressed:
// - onClick/onChange handlers not firing due to missing "use client"
// - No feedback during uploads; no error surfacing
// - Inconsistent styling and missing accessibility attributes
// - List not refreshing after successful upload
//
// Expected API (adjust endpoints if your routes differ):
//   GET  /api/study-materials               -> Item[]
//   POST /api/study-materials/upload  (FormData: file) -> { ok: true, ... }
//
// Item shape example returned by GET:
//   { id: string; filename: string; url: string; size?: number; uploadedAt?: string }
//
// Dependencies: <Button>, <Input>, cn().

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Item = {
  id: string;
  filename: string;
  url: string;
  size?: number; // bytes
  uploadedAt?: string; // ISO string
};

const API = {
  list: "/api/study-materials",
  upload: "/api/study-materials/upload",
};

// Accept common doc/image types; adjust as needed.
const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.zip,.rar";

const MAX_FILE_MB = 50; // client-side size guard

function bytesPretty(b?: number) {
  if (!b && b !== 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = b;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function StudyMaterials() {
  const [listLoading, setListLoading] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);
  const [file, setFile] = React.useState<File | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  async function refresh() {
    setError(null);
    setListLoading(true);
    try {
      const res = await fetch(API.list, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed to load materials."));
      const data = (await res.json()) as Item[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load materials.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setListLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setError(null);
    setFile(f);
  }

  async function onUpload() {
    setError(null);
    if (!file) {
      setError("Select a file to upload.");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    // Client-side size guard
    const tooBig = file.size > MAX_FILE_MB * 1024 * 1024;
    if (tooBig) {
      setError(`File is too large. Maximum size is ${MAX_FILE_MB} MB.`);
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);

      const res = await fetch(API.upload, { method: "POST", body: fd });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Upload failed.");
      }

      // Clear selection, refresh list
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Upload failed. Please try again.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Study Materials</h2>
        <p className="text-sm text-muted-foreground">
          Upload files (PDF, DOCX, PPTX, images, etc.) and share with students.
        </p>
      </header>

      {/* Error banner */}
      {error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
        >
          {error}
        </div>
      )}

      {/* Uploader */}
      <div className="rounded-xl border bg-card p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex-1">
            <label htmlFor="material-file" className="block text-sm font-medium">
              Select file
            </label>
            <Input
              id="material-file"
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              onChange={onPick}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Accepted: {ACCEPT.replaceAll(".", "").replaceAll(",", ", ")} • Max {MAX_FILE_MB} MB
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setFile(null);
                setError(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={uploading && !file}
            >
              Clear
            </Button>
            <Button onClick={onUpload} isLoading={uploading} disabled={!file || uploading}>
              Upload
            </Button>
          </div>
        </div>

        {file && (
          <div className="mt-2 text-xs text-muted-foreground">
            Selected: <span className="font-medium text-foreground">{file.name}</span>{" "}
            • {bytesPretty(file.size)}
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Files</div>
          <Button variant="secondary" onClick={refresh} disabled={listLoading}>
            {listLoading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="max-h-[60dvh] overflow-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              {listLoading ? "Loading…" : "No materials found."}
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((it) => (
                <li key={it.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{it.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {bytesPretty(it.size)} •{" "}
                      {it.uploadedAt ? new Date(it.uploadedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      "text-sm underline",
                      "focus-visible:outline-none focus-visible:ring-2 rounded-md px-1"
                    )}
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
