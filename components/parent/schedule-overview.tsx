"use client";

import * as React from "react";

type ScheduleItem = {
  studentId: string;
  studentName: string;
  day: string;
  startTime: string;
  endTime: string;
  activity: string;
  location: string;
};

export function ParentScheduleOverview() {
  const [schedule, setSchedule] = React.useState<ScheduleItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/schedule", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to load schedule."));
      const json = await res.json();
      setSchedule(json.schedule ?? []);
    } catch (err: any) {
      setError(err?.message ?? "Unable to load schedule.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const grouped = React.useMemo(() => {
    return schedule.reduce((acc, item) => {
      if (!acc[item.studentId]) {
        acc[item.studentId] = { name: item.studentName, items: [] as ScheduleItem[] };
      }
      acc[item.studentId].items.push(item);
      return acc;
    }, {} as Record<string, { name: string; items: ScheduleItem[] }>);
  }, [schedule]);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Weekly schedule</h2>
          <p className="text-sm text-muted-foreground">Monitor when lessons, labs, and clubs hold for each child.</p>
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

      <div className="mt-6 space-y-5">
        {Object.entries(grouped).map(([studentId, value]) => (
          <article key={studentId} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold">{value.name}</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {value.items.map((item, index) => (
                <li key={`${item.studentId}-${index}`} className="rounded-xl border border-dashed p-3 text-sm">
                  <p className="font-medium">{item.activity}</p>
                  <p className="mt-1 text-xs uppercase text-muted-foreground">{item.day}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.startTime} - {item.endTime} • {item.location}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        ))}

        {!schedule.length && !loading && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No scheduled items available.
          </p>
        )}
      </div>
    </section>
  );
}
