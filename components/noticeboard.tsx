// components/noticeboard.tsx
// Purpose: Create and list notices with reliable form handling and clear UX.
// Fixes addressed:
// - onSubmit not firing / mixed server-client handling
// - No error surfacing; no focus management for screen readers
// - List not refreshing after a successful create
// - Inconsistent spacing/semantics
//
// Expected API (adjust if your routes differ):
//   GET  /api/notices                 -> Notice[]
//   POST /api/notices { title, body } -> 200 OK + created notice (optional)
//
// Notice shape example returned by GET:
//   { id: string; title: string; body: string; createdAt: string }
//
// Dependencies: <Button>, <Input>, <Form> (from components/ui), cn() from lib/utils.

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Form from "@/components/ui/form";
import { cn } from "@/lib/utils";

type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO string
};

const API = {
  list: "/api/notices",
  create: "/api/notices",
};

export default function Noticeboard() {
  const [items, setItems] = React.useState<Notice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(API.list, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed to load notices."));
      const data = (await res.json()) as Notice[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load notices.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(
    data: Record<string, FormDataEntryValue | FormDataEntryValue[]>
  ) {
    const title = String(data.title || "").trim();
    const body = String(data.body || "").trim();

    if (!title || !body) {
      throw new Error("Both title and body are required.");
    }

    const res = await fetch(API.create, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Failed to publish notice.");
    }

    await refresh();
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-lg font-semibold">Noticeboard</h2>
        <p className="text-sm text-muted-foreground">
          Publish important announcements for students and staff.
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

      {/* Create Notice */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 text-sm font-medium">New notice</div>
        <Form onSubmit={handleCreate} resetOnSuccess showErrorBanner className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="notice-title" className="mb-1 block text-sm font-medium">
                Title
              </label>
              <Input id="notice-title" name="title" placeholder="e.g., Midterm Exams Schedule" required />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notice-body" className="mb-1 block text-sm font-medium">
                Body
              </label>
              <textarea
                id="notice-body"
                name="body"
                placeholder="Write the announcement here…"
                rows={4}
                className={cn(
                  "w-full rounded-xl border border-[hsl(var(--input))] bg-white p-3 text-sm",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
                )}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="submit">Publish Notice</Button>
          </div>
        </Form>
      </div>

      {/* Notices list */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-sm font-medium">Recent notices</div>
          <Button variant="secondary" onClick={refresh} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <ul className="divide-y">
          {items.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-muted-foreground">
              {loading ? "Loading…" : "No notices yet."}
            </li>
          ) : (
            items.map((n) => (
              <li key={n.id} className="px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{n.title}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {n.body}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={n.createdAt}
                    title={new Date(n.createdAt).toLocaleString()}
                  >
                    {new Date(n.createdAt).toLocaleString()}
                  </time>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
