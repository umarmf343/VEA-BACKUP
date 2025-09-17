"use client";

import * as React from "react";

type Student = {
  id: string;
  name: string;
  level: string;
  advisor: string;
  advisorEmail: string;
  homeroom: string;
  currentTermAverage: number;
  attendanceRate: number;
  behaviourRating: string;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    course: string;
    dueDate: string;
    status: string;
  }>;
  recentGrades: Array<{
    id: string;
    course: string;
    assessment: string;
    score: number;
    total: number;
    recordedAt: string;
    teacher: string;
  }>;
};

interface FetchState {
  loading: boolean;
  error: string | null;
}

export function ParentStudentOverview() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [{ loading, error }, setState] = React.useState<FetchState>({ loading: false, error: null });

  const load = React.useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const res = await fetch("/api/parent/students", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to load students."));
      const json = await res.json();
      setStudents(json.students ?? []);
    } catch (err: any) {
      setState({ loading: false, error: err?.message ?? "Unable to load students." });
      return;
    }
    setState({ loading: false, error: null });
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Children progress snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Track academic standing, advisor details, and current assignments for each child.
          </p>
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

      <div className="mt-6 grid gap-6">
        {students.map((student) => (
          <article key={student.id} className="rounded-2xl border bg-muted/30 p-5">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-base font-semibold">{student.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {student.level} • Homeroom {student.homeroom} • Advisor {student.advisor}
                </p>
                <p className="text-xs text-muted-foreground">{student.advisorEmail}</p>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl border bg-white/60 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Term average</dt>
                  <dd className="text-lg font-semibold">{student.currentTermAverage}%</dd>
                </div>
                <div className="rounded-xl border bg-white/60 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Attendance</dt>
                  <dd className="text-lg font-semibold">{Math.round(student.attendanceRate * 100)}%</dd>
                </div>
                <div className="rounded-xl border bg-white/60 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Behaviour</dt>
                  <dd className="text-lg font-semibold capitalize">{student.behaviourRating.replace("-", " ")}</dd>
                </div>
              </dl>
            </header>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border bg-white p-4">
                <header className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Upcoming assignments</h4>
                  <span className="text-xs text-muted-foreground">{student.upcomingAssignments.length} items</span>
                </header>
                <ul className="mt-3 space-y-3 text-sm">
                  {student.upcomingAssignments.map((assignment) => (
                    <li key={assignment.id} className="rounded-lg border border-dashed p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{assignment.title}</span>
                        <span className="text-xs uppercase text-muted-foreground">{assignment.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{assignment.course}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {new Date(assignment.dueDate).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                    </li>
                  ))}
                  {!student.upcomingAssignments.length && (
                    <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      No pending assignments.
                    </li>
                  )}
                </ul>
              </section>

              <section className="rounded-xl border bg-white p-4">
                <header className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Recent grades</h4>
                  <span className="text-xs text-muted-foreground">Last 3 updates</span>
                </header>
                <ul className="mt-3 space-y-3 text-sm">
                  {student.recentGrades.map((grade) => (
                    <li key={grade.id} className="rounded-lg border border-dashed p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{grade.course}</span>
                        <span className="text-xs text-muted-foreground">{grade.score}/{grade.total}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{grade.assessment}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Recorded {new Date(grade.recordedAt).toLocaleDateString("en-NG", { dateStyle: "medium" })} • {grade.teacher}
                      </p>
                    </li>
                  ))}
                  {!student.recentGrades.length && (
                    <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      No grade records yet for this term.
                    </li>
                  )}
                </ul>
              </section>
            </div>
          </article>
        ))}

        {!students.length && !loading && !error && (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No students are currently linked to this account.
          </p>
        )}
      </div>
    </section>
  );
}
