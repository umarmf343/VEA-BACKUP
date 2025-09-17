"use client";

import * as React from "react";

interface StudentNotificationApi {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "critical";
  read: boolean;
  actionUrl?: string;
}

interface NotificationsResponse {
  notifications: StudentNotificationApi[];
  error?: string;
}

const LEVEL_BADGE: Record<StudentNotificationApi["level"], string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function StudentNotificationCenter() {
  const [notifications, setNotifications] = React.useState<StudentNotificationApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updating, setUpdating] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/notifications", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as NotificationsResponse;
        throw new Error(json.error ?? "Failed to load notifications.");
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

  async function updateNotification(id: string, payload: { read?: boolean; archived?: boolean }) {
    setUpdating(id);
    setError(null);
    try {
      const res = await fetch(`/api/student/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to update notification.");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update notification.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Alerts & Notices</h2>
          <p className="text-sm text-muted-foreground">Review unread announcements, finance reminders, and safety notices.</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="space-y-3">
        {loading
          ? new Array(4).fill(null).map((_, index) => <NotificationSkeleton key={index} />)
          : notifications.length === 0
          ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                You're all caught up!
              </p>
            )
          : notifications.map((notification) => (
              <article
                key={notification.id}
                className={`space-y-3 rounded-xl border bg-card p-4 shadow-sm ${
                  notification.read ? "opacity-80" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                        LEVEL_BADGE[notification.level]
                      }`}
                    >
                      {notification.level === "critical"
                        ? "Critical"
                        : notification.level.charAt(0).toUpperCase() + notification.level.slice(1)}
                    </span>
                    <h3 className="mt-2 text-base font-semibold leading-tight">{notification.title}</h3>
                    <p className="text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">{formatDateTime(notification.timestamp)}</p>
                    {notification.actionUrl ? (
                      <a
                        href={notification.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-medium text-primary underline-offset-2 hover:underline"
                      >
                        View details
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 text-xs">
                    {!notification.read ? (
                      <button
                        type="button"
                        disabled={updating === notification.id}
                        onClick={() => updateNotification(notification.id, { read: true })}
                        className="rounded-lg border border-input bg-background px-3 py-1 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        Mark read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={updating === notification.id}
                      onClick={() => updateNotification(notification.id, { archived: true })}
                      className="rounded-lg border border-input bg-background px-3 py-1 font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}

function NotificationSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border bg-card p-4">
      <div className="h-3 w-16 rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}
