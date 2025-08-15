// app/api/payments/initialize/route.ts
// Purpose: Initialize a payment and return an authorization URL (mock/dev-safe).
// Used by: components/payment-modal.tsx (POST /api/payments/initialize)
//
// Behavior:
// - Validates { studentId, amount } from JSON body.
// - Creates a "pending" payment record in the same in-memory DB used by /api/payments.
// - Returns { authorization_url, reference }.
// - Replace the mock URL with a real Paystack init call when keys are available.
//
// Production note:
// - Swap the MOCK block with a real fetch to Paystack initialize endpoint.
// - Store the returned reference and authorization_url; persist to your DB.

import { NextResponse } from "next/server";

type Status = "pending" | "paid" | "failed";

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  status: Status;
  createdAt: string;
  reference?: string;
};

function ensureDB(): Payment[] {
  const g = globalThis as unknown as { _PAYMENTS?: Payment[] };
  if (!g._PAYMENTS) g._PAYMENTS = [];
  return g._PAYMENTS!;
}

function uid(prefix: string) {
  // Prefer crypto.randomUUID when available
  const core =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${core}`.replace(/-/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const studentId = String(body?.studentId ?? "").trim();
    const amount = Number(body?.amount);

    if (!studentId || !Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { message: "Invalid payload. Provide { studentId, amount>=100 }." },
        { status: 400 }
      );
    }

    // Create a new payment entry (pending)
    const db = ensureDB();
    const reference = uid("REF");
    const id = uid("PMT");
    const now = new Date().toISOString();

    const payment: Payment = {
      id,
      studentId,
      amount: Math.round(amount),
      status: "pending",
      createdAt: now,
      reference,
    };
    db.push(payment);

    // --- MOCK AUTH URL (dev) ---
    // Replace with actual Paystack initialize call when ready.
    // Example:
    // const pk = process.env.PAYSTACK_SECRET_KEY!;
    // const init = await fetch("https://api.paystack.co/transaction/initialize", {
    //   method: "POST",
    //   headers: {
    //     Authorization: `Bearer ${pk}`,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({ email, amount: amount * 100, reference })
    // }).then(r => r.json());
    // const authorization_url = init?.data?.authorization_url;

    const authorization_url = `https://paystack.com/pay/demo-${reference}`;

    return NextResponse.json(
      { authorization_url, reference },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to initialize payment." },
      { status: 500 }
    );
  }
}
