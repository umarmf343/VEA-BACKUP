// app/api/payments/route.ts
// Purpose: Return the list of payments for admin management.
// Used by: components/admin/payment-management.tsx (GET /api/payments)
//
// Notes:
// - Stores data in a dev-safe in-memory array (shared via globalThis).
// - In production, replace the "ensureDB()" section with real database calls.
// - Optional filter: /api/payments?status=pending|paid|failed

import { NextResponse } from "next/server";
import { PaymentStatus } from "@prisma/client";

import { paymentRepository } from "@/lib/repositories";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const payments = await paymentRepository.listPayments();
  const normalised = payments
    .filter((payment) =>
      status
        ? payment.status === status.toUpperCase()
            ? true
            : payment.status === (status === "paid"
                ? PaymentStatus.PAID
                : status === "failed"
                  ? PaymentStatus.FAILED
                  : PaymentStatus.PENDING)
        : true,
    )
    .map((payment) => ({
      id: payment.id,
      studentId: payment.studentId,
      amount: Number(payment.amount),
      status: payment.status === "PAID" ? "paid" : payment.status === "FAILED" ? "failed" : "pending",
      createdAt: payment.createdAt.toISOString(),
      reference: payment.reference,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return NextResponse.json(normalised, { status: 200 });
}
