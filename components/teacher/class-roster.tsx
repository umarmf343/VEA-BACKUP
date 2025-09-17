"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TeacherClassApi {
  id: string;
  name: string;
  level: string;
  subject: string;
  studentCount: number;
  attendanceRate: number;
  nextLessonTopic: string;
  schedule: Array<{ day: string; startTime: string; endTime: string; room: string }>;
}

interface ApiResponse {
  classes: TeacherClassApi[];
  error?: string;
}

export function TeacherClassRoster() {
  const [classes, setClasses] = React.useState<TeacherClassApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/classes", { cache: "no-store" });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed to load." }))).error ?? "Failed to load classes.");
      }
      const data = (await res.json()) as ApiResponse;
      setClasses(Array.isArray(data.classes) ? data.classes : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load classes.");
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
          <h2 className="text-lg font-semibold">Class Roster</h2>
          <p className="text-sm text-muted-foreground">Overview of classes assigned to you with quick schedule context.</p>
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

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Class
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Subject
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Students
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Attendance
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-muted-foreground">
                Next Lesson
              </th>
            </tr>
          </thead>
          <tbody>
            {loading && classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  Loading classes…
                </td>
              </tr>
            ) : null}

            {!loading && classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No classes assigned yet.
                </td>
              </tr>
            ) : null}

            {classes.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.level}</div>
                </td>
                <td className="px-4 py-3">{item.subject}</td>
                <td className="px-4 py-3 tabular-nums">{item.studentCount}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                    {(item.attendanceRate * 100).toFixed(0)}%
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div>{item.nextLessonTopic}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.schedule
                      .map((slot) => `${slot.day} ${slot.startTime} - ${slot.endTime} • ${slot.room}`)
                      .join(" | ")}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
