"use client";

import * as React from "react";

interface StudentScheduleItemApi {
  id: string;
  title: string;
  type: "class" | "exam" | "activity" | "deadline";
  startTime: string;
  endTime: string;
  location: string;
  courseId?: string;
  description?: string;
}

interface ScheduleResponse {
  schedule: StudentScheduleItemApi[];
  error?: string;
}

const TYPE_LABEL: Record<StudentScheduleItemApi["type"], string> = {
  class: "Class",
  exam: "Exam",
  activity: "Activity",
  deadline: "Deadline",
};

function formatDateTime(value?: string, withTime = true) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(
    date
  );
}

export function StudentScheduleOverview() {
  const [events, setEvents] = React.useState<StudentScheduleItemApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/schedule", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as ScheduleResponse;
        throw new Error(json.error ?? "Failed to load schedule.");
      }
      const json = (await res.json()) as ScheduleResponse;
      const sorted = (Array.isArray(json.schedule) ? json.schedule : []).sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      setEvents(sorted.slice(0, 6));
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
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Upcoming Schedule</h2>
          <p className="text-sm text-muted-foreground">Stay organised with your next sessions and important deadlines.</p>
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
          ? new Array(4).fill(null).map((_, index) => <ScheduleSkeleton key={index} />)
          : events.length === 0
          ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No scheduled events.
              </p>
            )
          : events.map((event) => (
              <article key={event.id} className="flex items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{TYPE_LABEL[event.type]}</p>
                  <h3 className="text-base font-semibold leading-tight">{event.title}</h3>
                  {event.description ? <p className="text-xs text-muted-foreground">{event.description}</p> : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{formatDateTime(event.startTime)}</p>
                  {event.type !== "deadline" ? <p>{formatDateTime(event.endTime, true)}</p> : null}
                  <p>{event.location}</p>
                </div>
              </article>
            ))}
      </div>
    </section>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="flex animate-pulse items-start justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="h-3 w-32 rounded bg-muted" />
      </div>
      <div className="space-y-2 text-right">
        <div className="h-3 w-28 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </div>
  );
}
