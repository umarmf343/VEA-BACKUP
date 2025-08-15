// components/internal-messaging.tsx
// Purpose: Stable internal messaging thread with polling + accessible UX.
// Fixes addressed:
// - onClick/onChange not firing (missing "use client")
// - No keyboard support (Enter to send) or Shift+Enter handling
// - No auto-scroll to latest message
// - No visible/accessible error banner
// - Race conditions on rapid sends (per-send busy state)
// - Inconsistent styles and spacing
//
// Expected API (adjust endpoints if your routes differ):
//   GET  /api/messages?peerId=<id>               -> Msg[]
//   POST /api/messages { to: string, body: string } -> 200 OK
//
// Msg shape example:
//   { id: string; from: string; to: string; body: string; createdAt: string }
//
// Dependencies: <Button>, <Input> (for search bar if needed), cn().

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = {
  id: string;
  from: string;
  to: string;
  body: string;
  createdAt: string; // ISO
};

const API = {
  list: "/api/messages",
  send: "/api/messages",
};

type Props = {
  /** ID of the user you are talking to */
  peerId: string;
  /** Optional current user id to align bubbles; if omitted, all left-aligned */
  currentUserId?: string;
  className?: string;
};

export default function InternalMessaging({ peerId, currentUserId, className }: Props) {
  const [msgs, setMsgs] = React.useState<Msg[]>([]);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);
  const endRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API.list}?peerId=${encodeURIComponent(peerId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed to load messages."));
      const data = (await res.json()) as Msg[];
      setMsgs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load messages.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    const t = setInterval(refresh, 5000); // poll every 5s
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerId]);

  // Auto-scroll to latest
  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  async function onSend() {
    const body = text.trim();
    if (!body) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(API.send, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: peerId, body }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to send message.");
      }
      setText("");
      await refresh();
      textareaRef.current?.focus();
    } catch (err: any) {
      setError(err?.message || "Failed to send message.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <section className={cn("flex h-full max-h-[70dvh] flex-col rounded-xl border", className)}>
      {/* Error banner */}
      {error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="m-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
        >
          {error}
        </div>
      )}

      {/* Thread */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && msgs.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">Loading…</p>
        ) : msgs.length === 0 ? (
          <p className="px-1 py-2 text-sm text-muted-foreground">No messages yet. Say hello!</p>
        ) : (
          <ul className="space-y-2">
            {msgs.map((m) => {
              const mine = currentUserId && m.from === currentUserId;
              return (
                <li
                  key={m.id}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 shadow-sm",
                      mine
                        ? "bg-[hsl(var(--brand))] text-white"
                        : "bg-[hsl(var(--muted))] text-foreground"
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                    <div
                      className={cn(
                        "mt-1 text-[10px]",
                        mine ? "text-white/80" : "text-muted-foreground"
                      )}
                      title={new Date(m.createdAt).toLocaleString()}
                    >
                      {new Date(m.createdAt).toLocaleString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div className="border-t p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
            rows={2}
            className={cn(
              "min-h-[2.5rem] w-full resize-y rounded-xl border border-[hsl(var(--input))] bg-white p-2 text-sm",
              "text-foreground placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            )}
          />
          <Button onClick={onSend} isLoading={sending} disabled={!text.trim() || sending}>
            Send
          </Button>
        </div>
      </div>
    </section>
  );
}
