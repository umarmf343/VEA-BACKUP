"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TeacherNotificationApi {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "critical";
  read: boolean;
  actionUrl?: string;
}

interface NotificationsResponse {
  notifications: TeacherNotificationApi[];
}

const LEVEL_STYLES: Record<TeacherNotificationApi["level"], string> = {
  info: "bg-blue-100 text-blue-800",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-800",
  critical: "bg-red-100 text-red-800",
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function TeacherNotificationPanel() {
  const [notifications, setNotifications] = React.useState<TeacherNotificationApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/notifications", { cache: "no-store" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to load notifications.");
      }
      const json = (await res.json()) as NotificationsResponse;
      setNotifications(Array.isArray(json.notifications) ? json.notifications : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function markRead(id: string) {
    try {
      const res = await fetch(`/api/teacher/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to update notification.");
      }
      const json = (await res.json()) as { notification: TeacherNotificationApi };
      setNotifications((prev) => prev.map((notification) => (notification.id === id ? json.notification : notification)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notification.");
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="text-sm text-muted-foreground">Stay on top of attendance alerts, submissions, and meetings.</p>
        </div>
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
      </header>

      {error ? (
        <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        {loading && notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading notifications…</p>
        ) : null}

        {!loading && notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications right now.</p>
        ) : null}

        {notifications.map((notification) => (
          <article key={notification.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold leading-tight">{notification.title}</h3>
                <p className="text-xs text-muted-foreground">{formatTimestamp(notification.timestamp)}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", LEVEL_STYLES[notification.level])}>
                {notification.level === "critical"
                  ? "Critical"
                  : notification.level === "warning"
                  ? "Warning"
                  : notification.level === "success"
                  ? "Success"
                  : "Info"}
              </span>
            </header>

            <p className="mt-2 text-sm text-muted-foreground">{notification.message}</p>

            <div className="mt-4 flex items-center justify-between">
              {notification.actionUrl ? (
                <a
                  href={notification.actionUrl}
                  className="text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  View details
                </a>
              ) : <span className="text-xs text-muted-foreground">No follow-up required.</span>}

              <button
                type="button"
                onClick={() => markRead(notification.id)}
                disabled={notification.read}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium",
                  notification.read
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                {notification.read ? "Acknowledged" : "Mark as read"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
