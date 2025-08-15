// app/api/payments/verify/route.ts
// Purpose: Verify a payment record (mock/dev-safe).
// Used by: components/admin/payment-management.tsx (POST /api/payments/verify)
//
// Behavior:
// - Accepts JSON: { id: string }.
// - Looks up the payment in the same in-memory DB as /api/payments.
// - Marks it as "paid" to simulate a successful gateway verification.
// - Returns 200 with the updated record, or 404 if not found.
//
// Production note:
// - Replace the mock update with a real verification against Paystack (by reference).
// - Persist the verified status to your database.

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

    // Mock verification result: mark as paid if it was pending/failed
    db[idx] = { ...db[idx], status: "paid" };

    return NextResponse.json(db[idx], { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
