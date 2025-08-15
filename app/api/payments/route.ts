// app/api/payments/route.ts
// Purpose: Return the list of payments for admin management.
// Used by: components/admin/payment-management.tsx (GET /api/payments)
//
// Notes:
// - Stores data in a dev-safe in-memory array (shared via globalThis).
// - In production, replace the "ensureDB()" section with real database calls.
// - Optional filter: /api/payments?status=pending|paid|failed

import { NextResponse } from "next/server";

type Status = "pending" | "paid" | "failed";

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  status: Status;
  createdAt: string; // ISO
  reference?: string;
}

/** Keep a dev-safe, hot-reload-friendly in-memory store */
function ensureDB(): Payment[] {
  const g = globalThis as unknown as { _PAYMENTS?: Payment[] };
  if (!g._PAYMENTS) {
    g._PAYMENTS = [
      {
        id: "pmt_001",
        studentId: "STU-1001",
        amount: 15000,
        status: "pending",
        createdAt: new Date().toISOString(),
        reference: "REF-001",
      },
      {
        id: "pmt_002",
        studentId: "STU-1002",
        amount: 32000,
        status: "paid",
        createdAt: new Date(Date.now() - 86_400_000).toISOString(),
        reference: "REF-002",
      },
      {
        id: "pmt_003",
        studentId: "STU-1003",
        amount: 25000,
        status: "failed",
        createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        reference: "REF-003",
      },
    ];
  }
  return g._PAYMENTS!;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as Status | null;

  const db = ensureDB();
  const items = status ? db.filter((p) => p.status === status) : db;

  // Sort newest first
  items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json(items, { status: 200 });
}
