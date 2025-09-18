"use client";

import * as React from "react";

interface StudentSupportUpdate {
  id: string;
  author: "student" | "advisor";
  message: string;
  timestamp: string;
}

interface StudentSupportRequestApi {
  id: string;
  topic: string;
  description: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  lastUpdated: string;
  updates: StudentSupportUpdate[];
}

interface SupportResponse {
  requests: StudentSupportRequestApi[];
  error?: string;
}

const STATUS_STYLE: Record<StudentSupportRequestApi["status"], string> = {
  open: "border-amber-200 bg-amber-50 text-amber-800",
  "in-progress": "border-blue-200 bg-blue-50 text-blue-700",
  resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function toTimestamp(value?: string) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function sortRequests(requests: StudentSupportRequestApi[]) {
  return requests.slice().sort((a, b) => toTimestamp(b.lastUpdated) - toTimestamp(a.lastUpdated));
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function StudentSupportPanel() {
  const [requests, setRequests] = React.useState<StudentSupportRequestApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [replyDrafts, setReplyDrafts] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState({ topic: "", description: "" });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/support", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as SupportResponse;
        throw new Error(json.error ?? "Failed to load support requests.");
      }
      const json = (await res.json()) as SupportResponse;
      setRequests(Array.isArray(json.requests) ? sortRequests(json.requests) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load support requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.topic.trim() || !form.description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/student/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: form.topic.trim(), description: form.description.trim() }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to submit request.");
      }
      const json = (await res.json()) as { request: StudentSupportRequestApi };
      setRequests((prev) => sortRequests([json.request, ...prev]));
      setForm({ topic: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  async function sendUpdate(id: string) {
    const message = replyDrafts[id]?.trim();
    if (!message) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to send update.");
      }
      const json = (await res.json()) as { request: StudentSupportRequestApi };
      setRequests((prev) => sortRequests(prev.map((item) => (item.id === id ? json.request : item))));
      setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send update.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Support & Guidance</h2>
        <p className="text-sm text-muted-foreground">Reach out to mentors and track responses to your requests.</p>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <label htmlFor="support-topic" className="text-sm font-medium text-foreground">
            Topic
          </label>
          <input
            id="support-topic"
            type="text"
            required
            value={form.topic}
            onChange={(event) => setForm((prev) => ({ ...prev, topic: event.target.value }))}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="support-description" className="text-sm font-medium text-foreground">
            How can we help?
          </label>
          <textarea
            id="support-description"
            required
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {submitting ? "Sending…" : "Submit request"}
        </button>
      </form>

      <div className="space-y-3">
        {loading
          ? new Array(2).fill(null).map((_, index) => <SupportSkeleton key={index} />)
          : requests.length === 0
          ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No open requests.
              </p>
            )
          : requests.map((request) => (
              <article key={request.id} className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold leading-tight">{request.topic}</h3>
                      <p className="text-xs text-muted-foreground">Opened {formatDateTime(request.createdAt)}</p>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[request.status]}`}>
                      {request.status === "in-progress"
                        ? "In progress"
                        : request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{request.description}</p>
                </div>

                <div className="space-y-2">
                  {request.updates.map((update) => (
                    <div key={update.id} className="rounded-lg bg-muted/40 p-3 text-xs">
                      <p className="font-medium text-foreground">
                        {update.author === "student" ? "You" : "Advisor"}
                        <span className="ml-2 text-muted-foreground">{formatDateTime(update.timestamp)}</span>
                      </p>
                      <p className="text-muted-foreground">{update.message}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <textarea
                    value={replyDrafts[request.id] ?? ""}
                    onChange={(event) =>
                      setReplyDrafts((prev) => ({ ...prev, [request.id]: event.target.value }))
                    }
                    placeholder="Send a follow-up message"
                    rows={2}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Last updated {formatDateTime(request.lastUpdated)}</span>
                    <button
                      type="button"
                      onClick={() => sendUpdate(request.id)}
                      disabled={submitting || !(replyDrafts[request.id] ?? "").trim()}
                      className="rounded-lg border border-input bg-background px-3 py-1 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Send update
                    </button>
                  </div>
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}

function SupportSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border bg-card p-4">
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
      <div className="h-16 w-full rounded bg-muted" />
    </div>
  );
}
