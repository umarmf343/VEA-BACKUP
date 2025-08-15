// app/api/dashboard/admin/route.ts
// Purpose: Return admin dashboard counters.
// Used by: components/admin-dashboard.tsx (GET /api/dashboard/admin)
//
// Behavior (dev/mock):
// - users: total users in the system (mock array below; replace with DB count).
// - paymentsToday: number of payments created today from the shared in-memory payments list.
// - notices: total notices from the shared in-memory notices list.
//
// Production:
// - Replace ensureUsers() and the global arrays with real database queries.

import { NextResponse } from "next/server";

type Status = "pending" | "paid" | "failed";

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

type User = {
  id: string;
  role: "student" | "teacher" | "admin";
  name: string;
  createdAt: string; // ISO
};

function ensureUsers(): User[] {
  const g = globalThis as unknown as { _USERS?: User[] };
  if (!g._USERS) {
    const now = Date.now();
    g._USERS = [
      { id: "u_001", role: "admin",   name: "Administrator", createdAt: new Date(now - 10 * 86_400_000).toISOString() },
      { id: "u_002", role: "teacher",  name: "Mr. Smith",     createdAt: new Date(now - 9 * 86_400_000).toISOString() },
      { id: "u_003", role: "teacher",  name: "Ms. Johnson",   createdAt: new Date(now - 9 * 86_400_000).toISOString() },
      { id: "u_004", role: "student",  name: "STU-1001",      createdAt: new Date(now - 8 * 86_400_000).toISOString() },
      { id: "u_005", role: "student",  name: "STU-1002",      createdAt: new Date(now - 8 * 86_400_000).toISOString() },
      { id: "u_006", role: "student",  name: "STU-1003",      createdAt: new Date(now - 8 * 86_400_000).toISOString() }
    ];
  }
  return g._USERS!;
}

function getPayments(): Payment[] {
  const g = globalThis as unknown as { _PAYMENTS?: Payment[] };
  return g._PAYMENTS ?? [];
}

function getNotices(): Notice[] {
  const g = globalThis as unknown as { _NOTICES?: Notice[] };
  return g._NOTICES ?? [];
}

export async function GET() {
  const users = ensureUsers();
  const payments = getPayments();
  const notices = getNotices();

  // Payments created "today" in server's local time (dev). For production, use UTC + TZ-aware comparison.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.getTime();
  const end = start + 24 * 60 * 60 * 1000;

  const paymentsToday = payments.filter((p) => {
    const t = Date.parse(p.createdAt);
    return t >= start && t < end;
  }).length;

  return NextResponse.json(
    {
      users: users.length,
      paymentsToday,
      notices: notices.length
    },
    { status: 200 }
  );
}
