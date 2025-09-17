"use client";

import * as React from "react";

type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: "pending" | "submitted" | "graded";
  studentId: string;
  studentName: string;
};

interface FetchState {
  loading: boolean;
  error: string | null;
}

const STATUS_LABELS: Record<Assignment["status"], string> = {
  pending: "Pending",
  submitted: "Submitted",
  graded: "Graded",
};

export function ParentAssignmentReview() {
  const [assignments, setAssignments] = React.useState<Assignment[]>([]);
  const [{ loading, error }, setState] = React.useState<FetchState>({ loading: false, error: null });

  const load = React.useCallback(async () => {
    setState({ loading: true, error: null });
    try {
      const res = await fetch("/api/parent/assignments", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to load assignments."));
      const json = await res.json();
      setAssignments(json.assignments ?? []);
      setState({ loading: false, error: null });
    } catch (err: any) {
      setState({ loading: false, error: err?.message ?? "Unable to load assignments." });
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const updateStatus = React.useCallback(async (assignment: Assignment, status: Assignment["status"]) => {
    const previous = assignments;
    setAssignments((current) =>
      current.map((item) => (item.id === assignment.id ? { ...item, status } : item))
    );
    try {
      const res = await fetch(`/api/parent/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, studentId: assignment.studentId }),
      });
      if (!res.ok) {
        throw new Error(await res.text().catch(() => "Failed to update."));
      }
    } catch (error) {
      console.error("Unable to update assignment status", error);
      setAssignments(previous);
    }
  }, [assignments]);

  const overdue = React.useMemo(() => {
    const now = Date.now();
    return assignments.filter((assignment) => {
      if (assignment.status === "graded") return false;
      const due = new Date(assignment.dueDate).getTime();
      return due < now;
    });
  }, [assignments]);

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Assignment oversight</h2>
          <p className="text-sm text-muted-foreground">
            Keep track of submissions and gently remind learners before due dates lapse.
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

      {!!overdue.length && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-medium">Overdue reminders</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {overdue.map((item) => (
              <li key={item.id}>
                {item.title} for {item.studentName} (due {new Date(item.dueDate).toLocaleDateString("en-NG", { dateStyle: "medium" })})
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="py-3">Student</th>
              <th className="py-3">Assignment</th>
              <th className="py-3">Course</th>
              <th className="py-3">Due</th>
              <th className="py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="align-top">
                <td className="py-3">
                  <span className="font-medium">{assignment.studentName}</span>
                </td>
                <td className="py-3">
                  <div className="font-medium text-foreground">{assignment.title}</div>
                </td>
                <td className="py-3 text-muted-foreground">{assignment.course}</td>
                <td className="py-3 text-muted-foreground">
                  {new Date(assignment.dueDate).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                </td>
                <td className="py-3">
                  <select
                    className="w-full rounded-lg border border-input bg-background p-2 text-sm"
                    value={assignment.status}
                    onChange={(event) =>
                      updateStatus(assignment, event.target.value as Assignment["status"])
                    }
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!assignments.length && !loading && (
              <tr>
                <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                  No assignments to review at this time.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
