"use client";

import * as React from "react";

type Meeting = {
  id: string;
  studentId: string;
  staffName: string;
  staffRole: string;
  scheduledFor: string;
  agenda: string;
  location: "in-person" | "virtual";
  status: "scheduled" | "awaiting-confirmation" | "completed" | "cancelled";
  createdAt: string;
  notes?: string;
};

type Student = { id: string; name: string };

const STATUS_OPTIONS: Array<{ value: Meeting["status"]; label: string }> = [
  { value: "awaiting-confirmation", label: "Awaiting confirmation" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function ParentMeetingManager() {
  const [meetings, setMeetings] = React.useState<Meeting[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    studentId: "",
    staffName: "",
    staffRole: "",
    scheduledFor: "",
    agenda: "",
    location: "virtual" as Meeting["location"],
  });
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [meetingsRes, studentsRes] = await Promise.all([
        fetch("/api/parent/meetings", { cache: "no-store" }),
        fetch("/api/parent/students", { cache: "no-store" }),
      ]);
      if (!meetingsRes.ok) throw new Error(await meetingsRes.text().catch(() => "Unable to load meetings."));
      if (!studentsRes.ok) throw new Error(await studentsRes.text().catch(() => "Unable to load students."));
      const meetingsJson = await meetingsRes.json();
      const studentsJson = await studentsRes.json();
      setMeetings(meetingsJson.meetings ?? []);
      setStudents(studentsJson.students ?? []);
      if (!form.studentId && studentsJson.students?.length) {
        setForm((prev) => ({ ...prev, studentId: studentsJson.students[0].id }));
      }
    } catch (err: any) {
      setError(err?.message ?? "Unable to load meetings.");
    } finally {
      setLoading(false);
    }
  }, [form.studentId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const scheduleMeeting = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.studentId || !form.staffName || !form.scheduledFor || !form.agenda) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/parent/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to schedule meeting."));
      setForm((prev) => ({ ...prev, staffName: "", staffRole: "", scheduledFor: "", agenda: "" }));
      load();
    } catch (err: any) {
      setError(err?.message ?? "Unable to schedule meeting.");
    } finally {
      setSubmitting(false);
    }
  }, [form, load]);

  const updateMeeting = React.useCallback(
    async (meetingId: string, updates: Partial<Pick<Meeting, "status" | "scheduledFor" | "agenda" | "location">>) => {
      try {
        const res = await fetch(`/api/parent/meetings/${meetingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error(await res.text().catch(() => "Unable to update meeting."));
        load();
      } catch (error) {
        console.error("Failed to update meeting", error);
      }
    },
    [load]
  );

  const studentName = React.useCallback(
    (studentId: string) => students.find((student) => student.id === studentId)?.name ?? "Unknown",
    [students]
  );

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Meetings & conferences</h2>
          <p className="text-sm text-muted-foreground">Schedule touchpoints with advisors and track their confirmation status.</p>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,1fr]">
        <form onSubmit={scheduleMeeting} className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Book a new meeting</h3>
          <p className="mt-1 text-sm text-muted-foreground">Choose the child, preferred time, and the staff member to meet.</p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Student
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.studentId}
                onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select child
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Staff name
              <input
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.staffName}
                onChange={(event) => setForm((prev) => ({ ...prev, staffName: event.target.value }))}
                placeholder="e.g. Mrs. Bisi Olatunji"
                required
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Staff role
              <input
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.staffRole}
                onChange={(event) => setForm((prev) => ({ ...prev, staffRole: event.target.value }))}
                placeholder="Subject teacher, counsellor, etc."
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Scheduled for
              <input
                type="datetime-local"
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.scheduledFor}
                onChange={(event) => setForm((prev) => ({ ...prev, scheduledFor: event.target.value }))}
                required
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Location
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.location}
                onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value as Meeting["location"] }))}
              >
                <option value="virtual">Virtual (Teams/Zoom)</option>
                <option value="in-person">In person</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Agenda
              <textarea
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.agenda}
                onChange={(event) => setForm((prev) => ({ ...prev, agenda: event.target.value }))}
                rows={3}
                placeholder="Topics or questions to cover"
                required
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            disabled={submitting}
          >
            {submitting ? "Scheduling…" : "Schedule meeting"}
          </button>
        </form>

        <div className="space-y-4">
          {meetings.map((meeting) => (
            <article key={meeting.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <header className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold">{studentName(meeting.studentId)}</h3>
                  <p className="text-sm text-muted-foreground">{meeting.staffName} • {meeting.staffRole}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(meeting.scheduledFor).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <select
                  className="h-9 rounded-lg border border-input bg-background px-2 text-sm"
                  value={meeting.status}
                  onChange={(event) => updateMeeting(meeting.id, { status: event.target.value as Meeting["status"] })}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </header>

              <p className="mt-3 text-sm text-muted-foreground">{meeting.agenda}</p>
              {meeting.notes && <p className="mt-2 text-xs text-muted-foreground">Notes: {meeting.notes}</p>}

              <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>Created {new Date(meeting.createdAt).toLocaleDateString("en-NG", { dateStyle: "medium" })}</span>
                <span className="capitalize">Location: {meeting.location.replace("-", " ")}</span>
              </div>
            </article>
          ))}

          {!meetings.length && !loading && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No meetings scheduled yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
