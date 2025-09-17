"use client";

import * as React from "react";

interface StudentGradeApi {
  id: string;
  courseId: string;
  courseName: string;
  assessment: string;
  score: number;
  maxScore: number;
  weight: number;
  grade: string;
  remarks?: string;
  issuedAt: string;
}

interface GradesResponse {
  grades: StudentGradeApi[];
  error?: string;
}

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

export function StudentGradeOverview() {
  const [grades, setGrades] = React.useState<StudentGradeApi[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/grades", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as GradesResponse;
        throw new Error(json.error ?? "Failed to load grades.");
      }
      const json = (await res.json()) as GradesResponse;
      const sorted = (Array.isArray(json.grades) ? json.grades : []).sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );
      setGrades(sorted);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load grades.");
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
          <h2 className="text-lg font-semibold">Latest Grades</h2>
          <p className="text-sm text-muted-foreground">See how each assessment contributes to your overall standing.</p>
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

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Assessment</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Issued</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? new Array(4).fill(null).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-36 rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-12 rounded bg-muted" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded bg-muted" />
                    </td>
                  </tr>
                ))
              : grades.length === 0
              ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                      No grades available yet.
                    </td>
                  </tr>
                )
              : grades.map((grade) => (
                  <tr key={grade.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{grade.courseName}</p>
                      <p className="text-xs text-muted-foreground">{grade.courseId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{grade.assessment}</p>
                      {grade.remarks ? <p className="text-xs text-muted-foreground">{grade.remarks}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">
                        {grade.score}/{grade.maxScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">{Math.round(grade.weight * 100)}%</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {grade.grade}
                      </span>
                    </td>
                    <td className="px-4 py-3">{formatDate(grade.issuedAt)}</td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
