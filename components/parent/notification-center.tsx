"use client";

import * as React from "react";

type Notification = {
  id: string;
  title: string;
  message: string;
  category: string;
  status: "new" | "read" | "archived";
  createdAt: string;
  actionUrl?: string;
};

export function ParentNotificationCenter() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Notification["status"] | "all">("all");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/notifications", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to load notifications."));
      const json = await res.json();
      setNotifications(json.notifications ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const visible = React.useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((notification) => notification.status === filter);
  }, [notifications, filter]);

  const updateStatus = React.useCallback(async (id: string, status: Notification["status"]) => {
    setNotifications((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
    try {
      const res = await fetch(`/api/parent/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to update notification."));
    } catch (error) {
      console.error("Failed to update notification", error);
      load();
    }
  }, [load]);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Notification center</h2>
          <p className="text-sm text-muted-foreground">Acknowledge fee reminders, meeting invites, and school-wide alerts.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            value={filter}
            onChange={(event) => setFilter(event.target.value as typeof filter)}
          >
            <option value="all">All notices</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="archived">Archived</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-6 space-y-4">
        {visible.map((notification) => (
          <article key={notification.id} className="rounded-2xl border bg-white p-5 shadow-sm">
            <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase text-muted-foreground">{notification.category}</p>
                <h3 className="text-base font-semibold">{notification.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
              </div>
              <div className="flex gap-2 text-sm">
                {notification.status !== "read" && (
                  <button
                    type="button"
                    className="rounded-lg border border-input px-3 py-2"
                    onClick={() => updateStatus(notification.id, "read")}
                  >
                    Mark as read
                  </button>
                )}
                {notification.status !== "archived" && (
                  <button
                    type="button"
                    className="rounded-lg border border-input px-3 py-2"
                    onClick={() => updateStatus(notification.id, "archived")}
                  >
                    Archive
                  </button>
                )}
              </div>
            </header>
            <footer className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Sent {new Date(notification.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</span>
              {notification.actionUrl && (
                <a className="text-primary underline" href={notification.actionUrl}>
                  Open related page
                </a>
              )}
            </footer>
          </article>
        ))}

        {!visible.length && !loading && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No notifications match this filter.
          </p>
        )}
      </div>
    </section>
  );
}
