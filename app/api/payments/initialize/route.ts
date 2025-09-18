// app/api/payments/initialize/route.ts
// Purpose: Initialize a Paystack payment (real call if key present) and return authorization URL.
// Used by: components/payment-modal.tsx (POST /api/payments/initialize)
//
// Request JSON:
//   {
//     "studentId": "STU-1001",
//     "amount": 15000,
//     // optional, strongly recommended for real gateway calls:
//     "email": "student@example.com",
//     "callbackUrl": "https://yourapp.com/payments/callback" // optional
//   }
//
// Behavior:
// - If PAYSTACK_SECRET_KEY is set, calls Paystack's initialize API and returns its authorization_url + reference.
// - If PAYSTACK_SECRET_KEY is NOT set (dev), returns a MOCK authorization_url and creates a pending record.
// - Always persists a record in the same in-memory list used by /api/payments.
//
// ENV required for real calls:
//   PAYSTACK_SECRET_KEY=sk_live_xxx (or test key)
//   NEXT_PUBLIC_APP_URL=https://your-app.example (fallback for callback URL)
//
// NOTE: Replace the in-memory DB with your real persistence layer in production.

import { NextResponse } from "next/server";
import { createRateLimit, getClientIp } from "@/lib/security";

export const PAYMENT_INITIALIZE_RATE_LIMIT = { windowMs: 60 * 1000, max: 15 };

const initializeRateLimiter = createRateLimit(
  PAYMENT_INITIALIZE_RATE_LIMIT.windowMs,
  PAYMENT_INITIALIZE_RATE_LIMIT.max
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
    { message: "Too many payment initializations. Please slow down." },
    { status: 429, headers }
  );
};

export const resetInitializeRateLimit = () => {
  initializeRateLimiter.reset();
};

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
  const core =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}_${core}`.replace(/-/g, "");
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const throttle = initializeRateLimiter.attempt(`ip:${ip}`);
    if (!throttle.success) {
      return buildThrottleResponse(throttle.retryAfter);
    }

    const body = await req.json().catch(() => ({}));
    const studentId = String(body?.studentId ?? "").trim();
    const amount = Number(body?.amount);
    const emailRaw = body?.email ? String(body.email).trim() : "";
    const callbackUrlRaw = body?.callbackUrl ? String(body.callbackUrl).trim() : "";

    if (!studentId || !Number.isFinite(amount) || amount < 100) {
      return NextResponse.json(
        { message: "Invalid payload. Provide { studentId, amount>=100 }." },
        { status: 400 }
      );
    }

    // Create or ensure DB record first (pending)
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

    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
    const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

    // Fallbacks for missing optional fields
    const email = emailRaw || `${studentId}@vea.local`;
    const callback_url =
      callbackUrlRaw ||
      (NEXT_PUBLIC_APP_URL ? `${NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/payments/callback` : undefined);

    // If no secret key, return MOCK (dev)
    if (!PAYSTACK_SECRET_KEY) {
      const authorization_url = `https://paystack.com/pay/dev-${reference}`;
      return NextResponse.json({ authorization_url, reference, id }, { status: 200 });
    }

    // Real Paystack initialize
    const initPayload: Record<string, any> = {
      email,
      amount: payment.amount * 100, // kobo
      reference,
      metadata: {
        studentId,
        paymentId: id,
      },
    };
    if (callback_url) initPayload.callback_url = callback_url;

    const resp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initPayload),
    });

    const result = await resp.json().catch(() => ({} as any));

    if (!resp.ok || !result?.status) {
      // Keep the record pending; surface gateway message if available
      const msg =
        (result?.message && String(result.message)) ||
        `Paystack initialize failed (${resp.status})`;
      return NextResponse.json({ message: msg }, { status: 502 });
    }

    const authorization_url = result?.data?.authorization_url;
    if (!authorization_url) {
      return NextResponse.json(
        { message: "Paystack response missing authorization_url." },
        { status: 502 }
      );
    }

    return NextResponse.json({ authorization_url, reference, id }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { message: e?.message || "Failed to initialize payment." },
      { status: 500 }
    );
  }
}
