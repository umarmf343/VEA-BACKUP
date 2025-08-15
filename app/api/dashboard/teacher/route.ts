// app/api/dashboard/teacher/route.ts
// Purpose: Return teacher dashboard counters.
// Used by: components/teacher-dashboard.tsx (GET /api/dashboard/teacher)
//
// Behavior (dev/mock):
// - pendingMarks: count of submissions assigned to this teacher that are not graded
// - assignments:   count of assignments created by this teacher
// - messages:      count of messages addressed to this teacher
//
// Production:
// - Replace the ensure*() mocks with real DB queries filtered by the authenticated user.

import { NextResponse } from "next/server";

type Submission = {
  id: string;
  assignmentId: string;
  teacherId: string;
  studentId: string;
  graded: boolean;
  submittedAt: string; // ISO
};

type Assignment = {
  id: string;
  teacherId: string;
  title: string;
  createdAt: string; // ISO
};

type Msg = {
  id: string;
  from: string;
  to: string;
  body: string;
  createdAt: string; // ISO
};

function ensureAssignments(): Assignment[] {
  const g = globalThis as unknown as { _T_ASSIGNMENTS?: Assignment[] };
  if (!g._T_ASSIGNMENTS) {
    const now = Date.now();
    g._T_ASSIGNMENTS = [
      { id: "ta_001", teacherId: "TEACHER", title: "Maths: Algebra 1", createdAt: new Date(now - 3 * 86_400_000).toISOString() },
      { id: "ta_002", teacherId: "TEACHER", title: "Physics: Kinematics", createdAt: new Date(now - 2 * 86_400_000).toISOString() },
      { id: "ta_003", teacherId: "TEACHER2", title: "Chemistry: Stoichiometry", createdAt: new Date(now - 1 * 86_400_000).toISOString() },
    ];
  }
  return g._T_ASSIGNMENTS!;
}

function ensureSubmissions(): Submission[] {
  const g = globalThis as unknown as { _SUBMISSIONS?: Submission[] };
  if (!g._SUBMISSIONS) {
    const now = Date.now();
    g._SUBMISSIONS = [
      { id: "sub_001", assignmentId: "ta_001", teacherId: "TEACHER",  studentId: "STUDENT1", graded: false, submittedAt: new Date(now - 4 * 60_000).toISOString() },
      { id: "sub_002", assignmentId: "ta_001", teacherId: "TEACHER",  studentId: "STUDENT2", graded: true,  submittedAt: new Date(now - 60 * 60_000).toISOString() },
      { id: "sub_003", assignmentId: "ta_002", teacherId: "TEACHER",  studentId: "STUDENT3", graded: false, submittedAt: new Date(now - 2 * 60_000).toISOString() },
      { id: "sub_004", assignmentId: "ta_003", teacherId: "TEACHER2", studentId: "STUDENT4", graded: false, submittedAt: new Date(now - 10 * 60_000).toISOString() },
    ];
  }
  return g._SUBMISSIONS!;
}

function getMessages(): Msg[] {
  const g = globalThis as unknown as { _MSGS?: Msg[] };
  return g._MSGS ?? [];
}

export async function GET(req: Request) {
  const me = (req.headers.get("x-user-id") || "TEACHER").trim();

  const assignments = ensureAssignments().filter((a) => a.teacherId === me).length;
  const pendingMarks = ensureSubmissions().filter((s) => s.teacherId === me && !s.graded).length;
  const messages = getMessages().filter((m) => m.to === me).length;

  return NextResponse.json(
    { pendingMarks, assignments, messages },
    { status: 200 }
  );
}
