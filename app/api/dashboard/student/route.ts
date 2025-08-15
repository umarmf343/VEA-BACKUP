// app/api/dashboard/student/route.ts
// Purpose: Return student dashboard counters.
// Used by: components/student-dashboard.tsx (GET /api/dashboard/student)
//
// Behavior (dev/mock):
// - Counts pending assignments for the current user (header: x-user-id; default "STUDENT").
// - Counts total notices from the shared in-memory notice list.
// - Counts this user's pending payments from the shared in-memory payments list.
//
// Production:
// - Replace the ensure*() mocks with real DB queries filtered by the authenticated user.

import { NextResponse } from "next/server";

type Status = "pending" | "paid" | "failed";

type Assignment = {
  id: string;
  studentId: string;
  title: string;
  submitted: boolean;
  dueAt: string; // ISO
};

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  status: Status;
  createdAt: string; // ISO
  reference?: string;
};

type Notice = {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
};

function ensureAssignments(): Assignment[] {
  const g = globalThis as unknown as { _ASSIGNMENTS?: Assignment[] };
  if (!g._ASSIGNMENTS) {
    const now = Date.now();
    g._ASSIGNMENTS = [
      {
        id: "asg_001",
        studentId: "STUDENT",
        title: "Mathematics Worksheet 1",
        submitted: false,
        dueAt: new Date(now + 2 * 86_400_000).toISOString(),
      },
      {
        id: "asg_002",
        studentId: "STUDENT",
        title: "English Essay",
        submitted: false,
        dueAt: new Date(now + 3 * 86_400_000).toISOString(),
      },
      {
        id: "asg_003",
        studentId: "STUDENT",
        title: "Chemistry Lab Report",
        submitted: true,
        dueAt: new Date(now - 1 * 86_400_000).toISOString(),
      },
    ];
  }
  return g._ASSIGNMENTS!;
}

function getPayments(): Payment[] {
  const g = globalThis as unknown as { _PAYMENTS?: Payment[] };
  return g._PAYMENTS ?? [];
}

function getNotices(): Notice[] {
  const g = globalThis as unknown as { _NOTICES?: Notice[] };
  return g._NOTICES ?? [];
}

export async function GET(req: Request) {
  const me = (req.headers.get("x-user-id") || "STUDENT").trim();

  const assignments = ensureAssignments().filter(
    (a) => a.studentId === me && !a.submitted
  );
  const paymentsPending = getPayments().filter(
    (p) => p.studentId === me && p.status === "pending"
  ).length;
  const notices = getNotices().length;

  const payload = {
    assignmentsDue: assignments.length,
    notices,
    paymentsPending,
  };

  return NextResponse.json(payload, { status: 200 });
}
