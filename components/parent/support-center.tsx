"use client";

import * as React from "react";

type Message = {
  id: string;
  author: "Parent" | "School";
  body: string;
  sentAt: string;
};

type Thread = {
  id: string;
  subject: string;
  studentId?: string;
  status: "open" | "in-progress" | "resolved";
  createdAt: string;
  updatedAt: string;
  messages: Message[];
};

type Student = { id: string; name: string };

export function ParentSupportCenter() {
  const [threads, setThreads] = React.useState<Thread[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [reply, setReply] = React.useState<Record<string, string>>({});
  const [form, setForm] = React.useState({ studentId: "", subject: "", body: "" });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [threadsRes, studentsRes] = await Promise.all([
        fetch("/api/parent/support", { cache: "no-store" }),
        fetch("/api/parent/students", { cache: "no-store" }),
      ]);
      if (!threadsRes.ok) throw new Error(await threadsRes.text().catch(() => "Unable to load support."));
      if (!studentsRes.ok) throw new Error(await studentsRes.text().catch(() => "Unable to load students."));
      const threadsJson = await threadsRes.json();
      const studentsJson = await studentsRes.json();
      setThreads(threadsJson.threads ?? []);
      setStudents(studentsJson.students ?? []);
      if (!form.studentId && studentsJson.students?.length) {
        setForm((prev) => ({ ...prev, studentId: studentsJson.students[0].id }));
      }
    } catch (err: any) {
      setError(err?.message ?? "Unable to load support threads.");
    } finally {
      setLoading(false);
    }
  }, [form.studentId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submitThread = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!form.subject || !form.body) return;
      setCreating(true);
      setError(null);
      try {
        const res = await fetch("/api/parent/support", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: form.subject,
            body: form.body,
            studentId: form.studentId || undefined,
          }),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Unable to open support ticket."));
        setForm((prev) => ({ ...prev, subject: "", body: "" }));
        load();
      } catch (err: any) {
        setError(err?.message ?? "Unable to open support ticket.");
      } finally {
        setCreating(false);
      }
    },
    [form, load]
  );

  const postReply = React.useCallback(
    async (threadId: string) => {
      const message = reply[threadId];
      if (!message) return;
      setReply((prev) => ({ ...prev, [threadId]: "" }));
      try {
        const res = await fetch(`/api/parent/support/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: message }),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Unable to send message."));
        load();
      } catch (error) {
        console.error("Failed to send support reply", error);
        load();
      }
    },
    [reply, load]
  );

  const updateStatus = React.useCallback(
    async (threadId: string, status: Thread["status"]) => {
      try {
        const res = await fetch(`/api/parent/support/${threadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Unable to update status."));
        load();
      } catch (error) {
        console.error("Failed to update support status", error);
      }
    },
    [load]
  );

  const studentName = React.useCallback(
    (studentId?: string) => students.find((student) => student.id === studentId)?.name ?? "General",
    [students]
  );

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Family support desk</h2>
          <p className="text-sm text-muted-foreground">
            Raise concerns, follow up on outstanding issues, and collaborate with school support staff.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <form onSubmit={submitThread} className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold">Open a new request</h3>
        <p className="mt-1 text-sm text-muted-foreground">We'll notify the relevant administrator immediately.</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-foreground">
            Related student
            <select
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
              value={form.studentId}
              onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
            >
              <option value="">General enquiry</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-foreground">
            Subject
            <input
              className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-foreground">
          Details
          <textarea
            className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
            value={form.body}
            onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
            rows={4}
            placeholder="Include as much context as possible"
            required
          />
        </label>

        <button
          type="submit"
          className="mt-6 h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
          disabled={creating}
        >
          {creating ? "Submitting…" : "Submit request"}
        </button>
      </form>

      <div className="mt-6 space-y-4">
        {threads.map((thread) => (
          <article key={thread.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-base font-semibold">{thread.subject}</h3>
                <p className="text-xs text-muted-foreground">
                  {studentName(thread.studentId)} • Opened {new Date(thread.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <select
                className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                value={thread.status}
                onChange={(event) => updateStatus(thread.id, event.target.value as Thread["status"])}
              >
                <option value="open">Open</option>
                <option value="in-progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </header>

            <ul className="mt-4 space-y-3 text-sm">
              {thread.messages.map((message) => (
                <li key={message.id} className="rounded-xl border border-dashed p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{message.author}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.sentAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{message.body}</p>
                </li>
              ))}
            </ul>

            {thread.status !== "resolved" && (
              <div className="mt-4 space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Reply
                  <textarea
                    className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                    value={reply[thread.id] ?? ""}
                    onChange={(event) => setReply((prev) => ({ ...prev, [thread.id]: event.target.value }))}
                    rows={3}
                    placeholder="Type your response"
                  />
                </label>
                <button
                  type="button"
                  className="h-10 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground"
                  onClick={() => postReply(thread.id)}
                >
                  Send reply
                </button>
              </div>
            )}

            <footer className="mt-4 text-xs text-muted-foreground">
              Last updated {new Date(thread.updatedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
            </footer>
          </article>
        ))}

        {!threads.length && !loading && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No support requests yet.
          </p>
        )}
      </div>
    </section>
  );
}
