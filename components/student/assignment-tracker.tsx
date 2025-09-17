"use client";

import * as React from "react";

interface StudentAssignmentApi {
  id: string;
  courseId: string;
  title: string;
  type: string;
  dueDate: string;
  status: "assigned" | "in-progress" | "submitted" | "graded" | "overdue";
  progress?: number;
  submittedAt?: string;
  grade?: string;
  feedback?: string;
}

interface StudentCourseLite {
  id: string;
  name: string;
}

interface AssignmentsResponse {
  assignments: StudentAssignmentApi[];
  courses?: StudentCourseLite[];
  error?: string;
}

const STATUS_LABEL: Record<StudentAssignmentApi["status"], string> = {
  assigned: "Not started",
  "in-progress": "In progress",
  submitted: "Submitted",
  graded: "Graded",
  overdue: "Overdue",
};

function formatDate(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sortAssignments(assignments: StudentAssignmentApi[]) {
  return assignments.slice().sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export function StudentAssignmentTracker() {
  const [assignments, setAssignments] = React.useState<StudentAssignmentApi[]>([]);
  const [courses, setCourses] = React.useState<Record<string, StudentCourseLite>>({});
  const [filter, setFilter] = React.useState<"all" | StudentAssignmentApi["status"]>("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [updating, setUpdating] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/assignments", { cache: "no-store" });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as AssignmentsResponse;
        throw new Error(json.error ?? "Failed to load assignments.");
      }
      const json = (await res.json()) as AssignmentsResponse;
      setAssignments(Array.isArray(json.assignments) ? sortAssignments(json.assignments) : []);
      const courseMap = new Map<string, StudentCourseLite>();
      (json.courses ?? []).forEach((course) => courseMap.set(course.id, course));
      setCourses(Object.fromEntries(courseMap));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(id: string, status: StudentAssignmentApi["status"], progress?: number) {
    setUpdating(id);
    setError(null);
    try {
      const res = await fetch(`/api/student/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, progress }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? "Failed to update assignment.");
      }
      const json = (await res.json()) as { assignment: StudentAssignmentApi };
      setAssignments((prev) => sortAssignments(prev.map((item) => (item.id === id ? json.assignment : item))));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment.");
    } finally {
      setUpdating(null);
    }
  }

  const filteredAssignments = assignments.filter((assignment) => (filter === "all" ? true : assignment.status === filter));

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Assignment Tracker</h2>
          <p className="text-sm text-muted-foreground">Monitor your submissions and stay ahead of deadlines.</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {["all", "assigned", "in-progress", "submitted", "graded", "overdue"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key as typeof filter)}
              className={`rounded-full px-3 py-1 font-medium transition ${
                filter === key
                  ? "bg-primary text-primary-foreground shadow"
                  : "border border-input bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {key === "all" ? "All" : STATUS_LABEL[key as StudentAssignmentApi["status"]]}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="space-y-3">
        {loading
          ? new Array(3).fill(null).map((_, index) => <AssignmentSkeleton key={index} />)
          : filteredAssignments.length === 0
          ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                No assignments match this filter.
              </p>
            )
          : filteredAssignments.map((assignment) => {
              const courseName = courses[assignment.courseId]?.name ?? "Unknown course";
              const dueSoon = new Date(assignment.dueDate).getTime() - Date.now() < 48 * 60 * 60 * 1000;
              return (
                <article key={assignment.id} className="rounded-xl border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{courseName}</p>
                      <h3 className="text-base font-semibold leading-tight">{assignment.title}</h3>
                      <p className="text-xs text-muted-foreground">{STATUS_LABEL[assignment.status]}</p>
                    </div>
                    <div className="space-y-1 text-right text-xs text-muted-foreground">
                      <p>Due {formatDate(assignment.dueDate)}</p>
                      {assignment.submittedAt ? <p>Submitted {formatDate(assignment.submittedAt)}</p> : null}
                      {assignment.grade ? <p className="font-medium text-foreground">Grade: {assignment.grade}</p> : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="w-full sm:w-1/2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{Math.round((assignment.progress ?? 0) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${assignment.status === "overdue" ? "bg-destructive" : "bg-primary"}`}
                          style={{ width: `${Math.min(100, Math.max(0, Math.round((assignment.progress ?? 0) * 100)))}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {assignment.status === "assigned" || assignment.status === "overdue" ? (
                        <button
                          type="button"
                          disabled={updating === assignment.id}
                          onClick={() => updateStatus(assignment.id, "in-progress", 0.25)}
                          className="rounded-lg border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          Start now
                        </button>
                      ) : null}
                      {assignment.status === "in-progress" ? (
                        <button
                          type="button"
                          disabled={updating === assignment.id}
                          onClick={() => updateStatus(assignment.id, "submitted", 1)}
                          className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                        >
                          Submit assignment
                        </button>
                      ) : null}
                      {assignment.status === "submitted" ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800">
                          Awaiting grading
                        </span>
                      ) : null}
                      {assignment.status === "graded" ? (
                        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          Completed
                        </span>
                      ) : null}
                      {dueSoon && assignment.status !== "submitted" && assignment.status !== "graded" ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                          Due soon
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {assignment.feedback ? (
                    <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">{assignment.feedback}</p>
                  ) : null}
                </article>
              );
            })}
      </div>
    </section>
  );
}

function AssignmentSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-xl border bg-card p-4">
      <div className="h-3 w-1/4 rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-2 w-full rounded bg-muted" />
      <div className="h-2 w-2/3 rounded bg-muted" />
    </div>
  );
}
