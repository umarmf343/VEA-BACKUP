"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TeacherAssessmentApi {
  id: string;
  classId: string;
  title: string;
  type: "quiz" | "test" | "exam" | "project";
  studentName: string;
  submittedAt: string;
  dueDate: string;
  status: "pending" | "in-review" | "completed";
  remarks?: string;
}

interface ClassesResponse {
  classes: Array<{ id: string; name: string }>;
}

interface AssessmentsResponse {
  assessments: TeacherAssessmentApi[];
}

const STATUS_STYLES: Record<TeacherAssessmentApi["status"], string> = {
  pending: "bg-amber-100 text-amber-800",
  "in-review": "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
};

function describeType(type: TeacherAssessmentApi["type"]) {
  switch (type) {
    case "quiz":
      return "Quiz";
    case "test":
      return "Test";
    case "exam":
      return "Exam";
    case "project":
      return "Project";
    default:
      return type;
  }
}

function formatRelative(date: string) {
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const now = Date.now();
  const value = Date.parse(date);
  if (Number.isNaN(value)) return "--";
  const diff = value - now;
  const minutes = Math.round(diff / 60000);
  const hours = Math.round(diff / 3600000);
  const days = Math.round(diff / 86400000);

  if (Math.abs(minutes) < 60) return formatter.format(minutes, "minute");
  if (Math.abs(hours) < 48) return formatter.format(hours, "hour");
  return formatter.format(days, "day");
}

export function TeacherAssessmentQueue() {
  const [assessments, setAssessments] = React.useState<TeacherAssessmentApi[]>([]);
  const [classes, setClasses] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assessmentsRes, classesRes] = await Promise.all([
        fetch("/api/teacher/assessments", { cache: "no-store" }),
        fetch("/api/teacher/classes", { cache: "no-store" }),
      ]);
      if (!assessmentsRes.ok) {
        throw new Error((await assessmentsRes.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to load assessments.");
      }
      if (!classesRes.ok) {
        throw new Error((await classesRes.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to load classes.");
      }

      const assessmentsJson = (await assessmentsRes.json()) as AssessmentsResponse;
      const classesJson = (await classesRes.json()) as ClassesResponse;

      setAssessments(Array.isArray(assessmentsJson.assessments) ? assessmentsJson.assessments : []);
      const classIndex: Record<string, string> = {};
      for (const cls of classesJson.classes ?? []) {
        classIndex[cls.id] = cls.name;
      }
      setClasses(classIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function markComplete(id: string) {
    try {
      const res = await fetch(`/api/teacher/assessments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to update assessment.");
      }
      const json = (await res.json()) as { assessment: TeacherAssessmentApi };
      setAssessments((prev) => prev.map((item) => (item.id === id ? json.assessment : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assessment.");
    }
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assessment Queue</h2>
          <p className="text-sm text-muted-foreground">Pending submissions awaiting review and grading.</p>
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

      <div className="grid gap-3 lg:grid-cols-2">
        {loading && assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading assessments…</p>
        ) : null}

        {!loading && assessments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending assessments. Great job staying ahead!</p>
        ) : null}

        {assessments.map((assessment) => (
          <article key={assessment.id} className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold leading-tight">{assessment.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {describeType(assessment.type)} • {classes[assessment.classId] ?? assessment.classId}
                </p>
              </div>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLES[assessment.status])}>
                {assessment.status === "in-review" ? "In review" : assessment.status === "completed" ? "Completed" : "Pending"}
              </span>
            </header>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Submitted by</dt>
                <dd className="font-medium">{assessment.studentName}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Submitted</dt>
                <dd>{formatRelative(assessment.submittedAt)}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Remarks</dt>
                <dd className="text-sm text-muted-foreground">{assessment.remarks || "—"}</dd>
              </div>
            </dl>

            <div className="mt-auto flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Due {formatRelative(assessment.dueDate)}</span>
              <button
                type="button"
                onClick={() => markComplete(assessment.id)}
                disabled={assessment.status === "completed"}
                className={cn(
                  "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium",
                  assessment.status === "completed"
                    ? "cursor-not-allowed bg-muted text-muted-foreground"
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
              >
                Mark complete
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
