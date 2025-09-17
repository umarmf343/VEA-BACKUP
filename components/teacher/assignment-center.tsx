"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface TeacherAssignmentApi {
  id: string;
  title: string;
  description: string;
  classId: string;
  dueDate: string;
  status: "draft" | "assigned" | "submitted" | "graded";
  submissionsPending: number;
  submissionsGraded: number;
}

interface TeacherClassLite {
  id: string;
  name: string;
}

interface AssignmentsResponse {
  assignments: TeacherAssignmentApi[];
  error?: string;
}

interface ClassesResponse {
  classes: TeacherClassLite[];
}

const STATUS_LABELS: Record<TeacherAssignmentApi["status"], string> = {
  draft: "Draft",
  assigned: "Active",
  submitted: "Awaiting Grading",
  graded: "Completed",
};

function formatDate(input: string) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function TeacherAssignmentCenter() {
  const [assignments, setAssignments] = React.useState<TeacherAssignmentApi[]>([]);
  const [classes, setClasses] = React.useState<TeacherClassLite[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const [form, setForm] = React.useState({
    title: "",
    classId: "",
    dueDate: "",
    description: "",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignmentsRes, classesRes] = await Promise.all([
        fetch("/api/teacher/assignments", { cache: "no-store" }),
        fetch("/api/teacher/classes", { cache: "no-store" }),
      ]);

      if (!assignmentsRes.ok) {
        throw new Error((await assignmentsRes.json().catch(() => ({ error: "Failed to load" }))).error ?? "Failed to load assignments.");
      }
      if (!classesRes.ok) {
        throw new Error((await classesRes.json().catch(() => ({ error: "Failed to load" }))).error ?? "Failed to load classes.");
      }

      const assignmentsJson = (await assignmentsRes.json()) as AssignmentsResponse;
      const classesJson = (await classesRes.json()) as ClassesResponse;
      setAssignments(Array.isArray(assignmentsJson.assignments) ? assignmentsJson.assignments : []);
      setClasses(Array.isArray(classesJson.classes) ? classesJson.classes.map((item) => ({ id: item.id, name: item.name })) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.classId.trim() || !form.dueDate) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          classId: form.classId,
          dueDate: new Date(form.dueDate).toISOString(),
          description: form.description.trim(),
        }),
      });
      if (!res.ok) {
        const message = (await res.json().catch(() => ({ error: "Failed" }))).error;
        throw new Error(message ?? "Failed to create assignment.");
      }
      const json = (await res.json()) as { assignment: TeacherAssignmentApi };
      setAssignments((prev) => [json.assignment, ...prev]);
      setForm({ title: "", classId: "", dueDate: "", description: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create assignment.");
    } finally {
      setSubmitting(false);
    }
  };

  async function markGraded(id: string, assignment: TeacherAssignmentApi) {
    try {
      const res = await fetch(`/api/teacher/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "graded", submissionsPending: 0, submissionsGraded: assignment.submissionsPending + assignment.submissionsGraded }),
      });
      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({ error: "Failed" }))).error ?? "Failed to update assignment.");
      }
      const json = (await res.json()) as { assignment: TeacherAssignmentApi };
      setAssignments((prev) => prev.map((item) => (item.id === id ? json.assignment : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignment.");
    }
  }

  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">Assignment Centre</h2>
        <p className="text-sm text-muted-foreground">Create and track assignments with real-time submission progress.</p>
      </header>

      <form onSubmit={handleSubmit} className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
        <div>
          <label htmlFor="assignment-title" className="text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id="assignment-title"
            type="text"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="assignment-class" className="text-sm font-medium text-foreground">
              Class
            </label>
            <select
              id="assignment-class"
              value={form.classId}
              onChange={(event) => setForm((prev) => ({ ...prev, classId: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="assignment-due" className="text-sm font-medium text-foreground">
              Due Date
            </label>
            <input
              id="assignment-due"
              type="datetime-local"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
              required
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div>
          <label htmlFor="assignment-description" className="text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            id="assignment-description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            rows={3}
            className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center justify-end gap-3">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              "inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground",
              "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              submitting && "opacity-75"
            )}
          >
            {submitting ? "Creating…" : "Create assignment"}
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {loading && assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading assignments…</p>
        ) : null}

        {!loading && assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No assignments yet. Create one above to get started.</p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          {assignments.map((assignment) => {
            const total = assignment.submissionsGraded + assignment.submissionsPending;
            const progress = total === 0 ? 0 : Math.round((assignment.submissionsGraded / total) * 100);

            return (
              <article key={assignment.id} className="flex h-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold leading-tight">{assignment.title}</h3>
                    <p className="text-xs text-muted-foreground">Due {formatDate(assignment.dueDate)}</p>
                  </div>
                  <span className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    assignment.status === "graded"
                      ? "bg-emerald-50 text-emerald-700"
                      : assignment.status === "submitted"
                      ? "bg-amber-50 text-amber-700"
                      : assignment.status === "assigned"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                  )}>
                    {STATUS_LABELS[assignment.status]}
                  </span>
                </header>

                {assignment.description ? <p className="text-sm text-muted-foreground">{assignment.description}</p> : null}

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pending</dt>
                    <dd className="text-base font-semibold tabular-nums">{assignment.submissionsPending}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Graded</dt>
                    <dd className="text-base font-semibold tabular-nums">{assignment.submissionsGraded}</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">Progress</dt>
                    <dd>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="mt-1 inline-block text-xs text-muted-foreground">{progress}% graded</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Class: {classes.find((cls) => cls.id === assignment.classId)?.name ?? assignment.classId}
                  </span>
                  <button
                    type="button"
                    onClick={() => markGraded(assignment.id, assignment)}
                    disabled={assignment.status === "graded"}
                    className={cn(
                      "inline-flex items-center rounded-lg px-3 py-1 text-xs font-medium",
                      assignment.status === "graded"
                        ? "cursor-not-allowed bg-muted text-muted-foreground"
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                    )}
                  >
                    Mark graded
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
