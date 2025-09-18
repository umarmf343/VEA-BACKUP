// app/api/payments/verify/route.ts
// Purpose: Verify a Paystack transaction by reference (real call if key present).
// Used by: components/admin/payment-management.tsx (POST /api/payments/verify)
//
// Request JSON (any one of these):
//   { "reference": "REF_xxx" }
//   { "id": "PMT_xxx" }   // will look up its reference
//
// Behavior:
// - If PAYSTACK_SECRET_KEY is set, calls Paystack GET /transaction/verify/:reference.
// - Maps Paystack data.status -> our status: success->"paid", failed->"failed", others->"pending".
// - Updates the same in-memory payments list used elsewhere.
// - If no PAYSTACK_SECRET_KEY (dev), simply marks the record "paid".
//
// NOTE: Replace the in-memory DB with your real persistence in production.

import { NextResponse } from "next/server";
import { createRateLimit, getClientIp } from "@/lib/security";

export const PAYMENT_VERIFY_RATE_LIMIT = { windowMs: 60 * 1000, max: 20 };

const verifyRateLimiter = createRateLimit(
  PAYMENT_VERIFY_RATE_LIMIT.windowMs,
  PAYMENT_VERIFY_RATE_LIMIT.max
);

const formatRetrySeconds = (retryAfterMs?: number) => {
  if (!retryAfterMs || retryAfterMs <= 0) {
    return undefined;
  }
  return Math.max(1, Math.ceil(retryAfterMs / 1000)).toString();
};

const buildThrottleResponse = (retryAfterMs?: number) => {
  const headers: Record<string, string> = {};
  const retry = formatRetrySeconds(retryAfterMs);
  if (retry) {
    headers["Retry-After"] = retry;
  }

  return NextResponse.json(
    { message: "Too many verification attempts. Please slow down." },
    { status: 429, headers }
  );
};

export const resetVerifyRateLimit = () => {
  verifyRateLimiter.reset();
};

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
    const ip = getClientIp(req);
    const throttle = verifyRateLimiter.attempt(`ip:${ip}`);
    if (!throttle.success) {
      return buildThrottleResponse(throttle.retryAfter);
    }

    const body = await req.json().catch(() => ({}));
    let reference = String(body?.reference || "").trim();
    const id = String(body?.id || "").trim();

    const db = ensureDB();

    // If only ID given, resolve its reference
    if (!reference && id) {
      const found = db.find((p) => p.id === id);
      if (!found) {
        return NextResponse.json({ message: "Payment not found." }, { status: 404 });
      }
      reference = String(found.reference || "").trim();
      if (!reference) {
        return NextResponse.json({ message: "Payment has no reference to verify." }, { status: 400 });
      }
    }

    if (!reference) {
      return NextResponse.json(
        { message: "Provide a payment 'reference' or 'id'." },
        { status: 400 }
      );
    }

    const idx = db.findIndex((p) => p.reference === reference || p.id === id);
    if (idx === -1) {
      return NextResponse.json({ message: "Payment not found." }, { status: 404 });
    }

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";

    // DEV fallback: no secret key -> mark as paid
    if (!PAYSTACK_SECRET_KEY) {
      db[idx] = { ...db[idx], status: "paid" };
      return NextResponse.json(db[idx], { status: 200 });
    }

    // Real verify call
    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });

    const result = await resp.json().catch(() => ({} as any));
    if (!resp.ok || !result?.status) {
      const msg =
        (result?.message && String(result.message)) ||
        `Paystack verify failed (${resp.status})`;
      return NextResponse.json({ message: msg }, { status: 502 });
    }

    // Map Paystack status
    const ps = String(result?.data?.status || "").toLowerCase();
    let nextStatus: Status = "pending";
    if (ps === "success") nextStatus = "paid";
    else if (ps === "failed") nextStatus = "failed";
    else nextStatus = "pending";

    // Optional: you can also validate amounts/currency here:
    // const amountKobo = Number(result?.data?.amount ?? 0);
    // const expectedKobo = db[idx].amount * 100;
    // if (amountKobo !== expectedKobo) { /* flag mismatch if needed */ }

    db[idx] = { ...db[idx], status: nextStatus };

    return NextResponse.json(db[idx], { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Verification failed." },
      { status: 500 }
    );
  }
}
