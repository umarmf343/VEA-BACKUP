"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ParentMetrics = {
  assignmentsDue: number;
  upcomingMeetings: number;
  unreadNotifications: number;
  outstandingBalance: number;
};

const ENDPOINT = "/api/dashboard/parent";
const POLL_INTERVAL = 10_000;

export function ParentDashboard() {
  const [metrics, setMetrics] = React.useState<ParentMetrics | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(ENDPOINT, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await response.text().catch(() => "Unable to load dashboard."));
      }
      const json = (await response.json()) as Partial<ParentMetrics>;
      setMetrics({
        assignmentsDue: Number(json.assignmentsDue ?? 0),
        upcomingMeetings: Number(json.upcomingMeetings ?? 0),
        unreadNotifications: Number(json.unreadNotifications ?? 0),
        outstandingBalance: Number(json.outstandingBalance ?? 0),
      });
    } catch (err: any) {
      setError(err?.message ?? "Unable to load dashboard.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Parent Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Monitor assignments, meetings, notifications, and outstanding balances.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className={cn(
            "h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm",
            "hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          )}
          disabled={loading}
          aria-live="polite"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

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

      {!metrics && !error ? (
        <div className="grid gap-3 sm:grid-cols-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Assignments to Review" value={metrics?.assignmentsDue ?? 0} />
          <MetricCard title="Upcoming Meetings" value={metrics?.upcomingMeetings ?? 0} />
          <MetricCard title="Unread Notices" value={metrics?.unreadNotifications ?? 0} />
          <MetricCard
            title="Outstanding Balance"
            value={metrics ? `₦${Math.round(metrics.outstandingBalance).toLocaleString("en-NG")}` : "₦0"}
          />
        </div>
      )}
    </section>
  );
}

function MetricCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="h-4 w-24 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </div>
  );
}
