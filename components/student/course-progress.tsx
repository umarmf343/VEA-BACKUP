"use client";

import * as React from "react";

interface StudentCourseApi {
  id: string;
  name: string;
  teacher: string;
  creditHours: number;
  progress: number;
  currentGrade: string;
  attendanceRate: number;
  nextSession?: {
    topic: string;
    startTime: string;
    location: string;
  };
  supportResources?: string[];
}

interface CoursesResponse {
  courses: StudentCourseApi[];
  error?: string;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function asPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function StudentCourseProgress() {
  const [courses, setCourses] = React.useState<StudentCourseApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/courses", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as CoursesResponse;
        throw new Error(json.error ?? "Failed to load courses.");
      }
      const json = (await res.json()) as CoursesResponse;
      setCourses(Array.isArray(json.courses) ? json.courses : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load courses.");
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
          <h2 className="text-lg font-semibold">Course Progress</h2>
          <p className="text-sm text-muted-foreground">Track how you are performing across enrolled subjects.</p>
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
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(loading ? new Array(4).fill(null) : courses).map((course, index) => (
            <article key={course?.id ?? index} className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm">
              {loading ? (
                <CourseSkeleton />
              ) : (
                <React.Fragment>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold leading-snug">{course.name}</h3>
                      <p className="text-sm text-muted-foreground">Facilitator: {course.teacher}</p>
                    </div>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {course.currentGrade}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{asPercent(course.progress ?? 0)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, Math.round((course.progress ?? 0) * 100)))}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Attendance: {asPercent(course.attendanceRate ?? 0)} • {course.creditHours} credits
                    </p>
                  </div>

                  {course.nextSession ? (
                    <div className="rounded-lg bg-muted/40 p-3 text-xs">
                      <p className="font-medium text-foreground">Next session</p>
                      <p className="text-muted-foreground">{course.nextSession.topic}</p>
                      <p className="text-muted-foreground">{formatDateTime(course.nextSession.startTime)}</p>
                      <p className="text-muted-foreground">{course.nextSession.location}</p>
                    </div>
                  ) : null}

                  {course.supportResources?.length ? (
                    <div className="space-y-1 text-xs">
                      <p className="font-medium text-foreground">Quick resources</p>
                      <ul className="space-y-1 text-muted-foreground">
                        {course.supportResources.slice(0, 3).map((resource: string) => (
                          <li key={resource} className="truncate">
                            <a
                              href={resource}
                              className="text-primary underline-offset-2 hover:underline"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {resource.replace(/^https?:\/\//, "")}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </React.Fragment>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function CourseSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3">
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-2 w-full rounded bg-muted" />
      <div className="h-2 w-3/4 rounded bg-muted" />
      <div className="h-10 rounded bg-muted" />
    </div>
  );
}
