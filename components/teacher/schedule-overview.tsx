"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ScheduleItemApi {
  id: string;
  title: string;
  type: "lesson" | "meeting" | "duty" | "event";
  startTime: string;
  endTime: string;
  location: string;
  classId?: string;
  notes?: string;
}

interface ScheduleResponse {
  schedule: ScheduleItemApi[];
}

const TYPE_COLORS: Record<ScheduleItemApi["type"], string> = {
  lesson: "bg-blue-100 text-blue-700",
  meeting: "bg-amber-100 text-amber-700",
  duty: "bg-purple-100 text-purple-700",
  event: "bg-emerald-100 text-emerald-700",
};

function formatTimeRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "--";
  const dateFormat = new Intl.DateTimeFormat("en-NG", { weekday: "short", month: "short", day: "numeric" });
  const timeFormat = new Intl.DateTimeFormat("en-NG", { hour: "numeric", minute: "2-digit" });
  return `${dateFormat.format(startDate)} • ${timeFormat.format(startDate)} - ${timeFormat.format(endDate)}`;
}

export function TeacherScheduleOverview() {
  const [schedule, setSchedule] = React.useState<ScheduleItemApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/schedule", { cache: "no-store" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to load schedule.");
      }
      const json = (await res.json()) as ScheduleResponse;
      setSchedule(Array.isArray(json.schedule) ? json.schedule : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Upcoming Schedule</h2>
          <p className="text-sm text-muted-foreground">Lessons, meetings, and duties for the coming days.</p>
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
        {loading && schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : null}

        {!loading && schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events on your schedule yet.</p>
        ) : null}

        {schedule.map((item) => (
          <article key={item.id} className="rounded-xl border bg-card p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold leading-tight">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{formatTimeRange(item.startTime, item.endTime)}</p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", TYPE_COLORS[item.type])}>
                {item.type === "lesson"
                  ? "Lesson"
                  : item.type === "meeting"
                  ? "Meeting"
                  : item.type === "duty"
                  ? "Duty"
                  : "Event"}
              </span>
            </header>

            <div className="mt-3 text-sm text-muted-foreground">
              <p>Location: {item.location}</p>
              {item.classId ? <p>Class: {item.classId}</p> : null}
              {item.notes ? <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground">{item.notes}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
