// app/api/payments/mark-paid/route.ts
// Purpose: Force-mark a payment as PAID (admin action).
// Used by: components/admin/payment-management.tsx (POST /api/payments/mark-paid)
//
// Behavior:
// - Accepts JSON: { id: string }.
// - Updates the in-memory payments DB record's status to "paid".
// - Returns 200 with the updated record, 404 if not found.
//
// Production note:
// - Replace in-memory DB with your real persistence layer.
// - Log admin actor and reason for audit trails.

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

function ensureDB(): Payment[] {
  const g = globalThis as unknown as { _PAYMENTS?: Payment[] };
  if (!g._PAYMENTS) g._PAYMENTS = [];
  return g._PAYMENTS!;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Missing payment id." }, { status: 400 });
    }

    const db = ensureDB();
    const idx = db.findIndex((p) => p.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: "Payment not found." }, { status: 404 });
    }

    db[idx] = { ...db[idx], status: "paid" };

    return NextResponse.json(db[idx], { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to mark as paid." },
      { status: 500 }
    );
  }
}
