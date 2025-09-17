"use client";

import * as React from "react";

type AttendanceRecord = {
  id: string;
  studentId: string;
  weekOf: string;
  attendancePercentage: number;
  tardies: number;
  absences: number;
  remarks?: string;
};

type Student = {
  id: string;
  name: string;
};

export function ParentAttendanceInsights() {
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = React.useState<string | "all">("all");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attendanceRes, studentsRes] = await Promise.all([
        fetch(selectedStudent === "all" ? "/api/parent/attendance" : `/api/parent/attendance?studentId=${selectedStudent}`, {
          cache: "no-store",
        }),
        fetch("/api/parent/students", { cache: "no-store" }),
      ]);

      if (!attendanceRes.ok) throw new Error(await attendanceRes.text().catch(() => "Unable to load attendance."));
      if (!studentsRes.ok) throw new Error(await studentsRes.text().catch(() => "Unable to load students."));

      const attendanceJson = await attendanceRes.json();
      const studentsJson = await studentsRes.json();

      setRecords(attendanceJson.attendance ?? []);
      setStudents((studentsJson.students ?? []).map((student: any) => ({ id: student.id, name: student.name })));
    } catch (err: any) {
      setError(err?.message ?? "Unable to load attendance data.");
    } finally {
      setLoading(false);
    }
  }, [selectedStudent]);

  React.useEffect(() => {
    load();
  }, [load]);

  const overallAverage = React.useMemo(() => {
    if (!records.length) return 0;
    return (
      records.reduce((sum, record) => sum + Number(record.attendancePercentage ?? 0), 0) / records.length
    );
  }, [records]);

  const tardies = React.useMemo(
    () => records.reduce((sum, record) => sum + Number(record.tardies ?? 0), 0),
    [records]
  );

  const absences = React.useMemo(
    () => records.reduce((sum, record) => sum + Number(record.absences ?? 0), 0),
    [records]
  );

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendance insights</h2>
          <p className="text-sm text-muted-foreground">Review weekly attendance trends and address emerging patterns early.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
            value={selectedStudent}
            onChange={(event) => setSelectedStudent(event.target.value as typeof selectedStudent)}
          >
            <option value="all">All children</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            className="h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border bg-white p-4">
          <dt className="text-xs uppercase text-muted-foreground">Average attendance</dt>
          <dd className="text-2xl font-semibold">{Math.round(overallAverage * 100)}%</dd>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <dt className="text-xs uppercase text-muted-foreground">Tardies</dt>
          <dd className="text-2xl font-semibold">{tardies}</dd>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <dt className="text-xs uppercase text-muted-foreground">Absences</dt>
          <dd className="text-2xl font-semibold">{absences}</dd>
        </div>
      </dl>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="py-3">Week of</th>
              <th className="py-3">Attendance</th>
              <th className="py-3">Tardies</th>
              <th className="py-3">Absences</th>
              <th className="py-3">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {records.map((record) => (
              <tr key={record.id}>
                <td className="py-3">
                  {new Date(record.weekOf).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                </td>
                <td className="py-3 font-semibold">{Math.round(record.attendancePercentage * 100)}%</td>
                <td className="py-3">{record.tardies}</td>
                <td className="py-3">{record.absences}</td>
                <td className="py-3 text-muted-foreground">{record.remarks ?? "—"}</td>
              </tr>
            ))}
            {!records.length && !loading && (
              <tr>
                <td className="py-6 text-center text-muted-foreground" colSpan={5}>
                  No attendance records for this selection.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
