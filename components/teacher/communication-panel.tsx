"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TeacherMessageApi {
  id: string;
  subject: string;
  preview: string;
  body: string;
  sentAt: string;
  sender: string;
  recipients: string[];
  read: boolean;
  archived?: boolean;
}

interface MessagesResponse {
  messages: TeacherMessageApi[];
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function TeacherCommunicationPanel() {
  const [messages, setMessages] = React.useState<TeacherMessageApi[]>([]);
  const [selectedMessageId, setSelectedMessageId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [composing, setComposing] = React.useState(false);
  const [form, setForm] = React.useState({ subject: "", body: "", recipients: "" });
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/messages", { cache: "no-store" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to load messages.");
      }
      const json = (await res.json()) as MessagesResponse;
      const list = Array.isArray(json.messages) ? json.messages : [];
      setMessages(list);
      if (list.length > 0) {
        setSelectedMessageId(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const selectedMessage = messages.find((item) => item.id === selectedMessageId) ?? null;

  async function markRead(id: string) {
    try {
      const res = await fetch(`/api/teacher/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to update message.");
      }
      const json = (await res.json()) as { message: TeacherMessageApi };
      setMessages((prev) => prev.map((message) => (message.id === id ? json.message : message)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update message.");
    }
  }

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const recipients = form.recipients
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (!form.subject.trim() || !form.body.trim() || recipients.length === 0) {
      setError("Please complete all fields to send a message.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject.trim(),
          body: form.body.trim(),
          recipients,
        }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to send message.");
      }
      const json = (await res.json()) as { message: TeacherMessageApi };
      setMessages((prev) => [json.message, ...prev]);
      setSelectedMessageId(json.message.id);
      setForm({ subject: "", body: "", recipients: "" });
      setComposing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Communication Hub</h2>
          <p className="text-sm text-muted-foreground">Keep track of parent and staff messages in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm",
              "transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => {
              setComposing((prev) => !prev);
              setError(null);
            }}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {composing ? "Close" : "New message"}
          </button>
        </div>
      </header>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {composing ? (
        <form onSubmit={handleSend} className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <div>
            <label htmlFor="message-subject" className="text-sm font-medium text-foreground">
              Subject
            </label>
            <input
              id="message-subject"
              type="text"
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
          <div>
            <label htmlFor="message-recipients" className="text-sm font-medium text-foreground">
              Recipients <span className="text-xs text-muted-foreground">(comma separated)</span>
            </label>
            <input
              id="message-recipients"
              type="text"
              value={form.recipients}
              onChange={(event) => setForm((prev) => ({ ...prev, recipients: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
          <div>
            <label htmlFor="message-body" className="text-sm font-medium text-foreground">
              Message
            </label>
            <textarea
              id="message-body"
              value={form.body}
              onChange={(event) => setForm((prev) => ({ ...prev, body: event.target.value }))}
              rows={4}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setComposing(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-3 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground",
                "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                sending && "opacity-75"
              )}
            >
              {sending ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[280px,1fr]">
        <aside className="rounded-xl border bg-card shadow-sm">
          <ul role="list" className="divide-y">
            {loading && messages.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">Loading messages…</li>
            ) : null}
            {!loading && messages.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">No messages yet.</li>
            ) : null}
            {messages.map((message) => (
              <li key={message.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMessageId(message.id);
                    if (!message.read) markRead(message.id);
                  }}
                  className={cn(
                    "flex w-full flex-col items-start gap-1 px-4 py-3 text-left",
                    selectedMessageId === message.id ? "bg-primary/10" : "hover:bg-muted",
                    !message.read && "font-semibold"
                  )}
                >
                  <span className="text-xs text-muted-foreground">{formatDate(message.sentAt)}</span>
                  <span className="line-clamp-1 text-sm leading-snug">{message.subject}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{message.preview || message.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <article className="rounded-xl border bg-card p-4 shadow-sm">
          {selectedMessage ? (
            <div className="space-y-3">
              <header className="space-y-1">
                <p className="text-sm text-muted-foreground">{formatDate(selectedMessage.sentAt)}</p>
                <h3 className="text-lg font-semibold">{selectedMessage.subject}</h3>
                <p className="text-sm text-muted-foreground">From {selectedMessage.sender}</p>
                <p className="text-xs text-muted-foreground">To {selectedMessage.recipients.join(", ")}</p>
              </header>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{selectedMessage.body}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a message to view the full conversation.</p>
          )}
        </article>
      </div>
    </section>
  );
}
