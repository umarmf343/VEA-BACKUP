// app/api/payments/webhook/route.ts
// Purpose: Receive Paystack webhooks and update payment records.
// Events: typically "charge.success", "charge.failed", etc.
//
// Security:
// - Verifies x-paystack-signature using your PAYSTACK_SECRET_KEY (HMAC-SHA512 over raw body).
// - If PAYSTACK_SECRET_KEY is missing (dev), it skips verification but still processes payload.
//
// Storage:
// - Updates the same in-memory payments list used by other payment endpoints.
// - Replace ensureDB() with your real persistence in production.

import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

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

function mapPaystackStatus(event: string | undefined, dataStatus: string | undefined): Status {
  const e = String(event || "").toLowerCase();
  const s = String(dataStatus || "").toLowerCase();

  if (e === "charge.success" || s === "success") return "paid";
  if (e === "charge.failed" || s === "failed") return "failed";
  return "pending";
}

export async function POST(req: Request) {
  // Read raw body for HMAC verification
  const raw = await req.text().catch(() => "");
  if (!raw) {
    return NextResponse.json({ message: "Empty body" }, { status: 400 });
  }

  // Attempt to parse once (we will need it regardless)
  let payload: any = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || "";
  const signatureHeader = req.headers.get("x-paystack-signature") || "";

  // Verify HMAC only if we have a secret key (production)
  if (PAYSTACK_SECRET_KEY) {
    try {
      const computed = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(raw).digest("hex");
      // Use constant-time comparison to avoid timing attacks
      const a = Buffer.from(signatureHeader, "utf8");
      const b = Buffer.from(computed, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ message: "Signature check failed" }, { status: 401 });
    }
  }

  // Extract Paystack fields
  const event = payload?.event as string | undefined;
  const data = payload?.data || {};
  const reference: string | undefined = data?.reference || payload?.reference;
  const status = mapPaystackStatus(event, data?.status);

  if (!reference) {
    // Without a reference we cannot reconcile reliably
    return NextResponse.json({ message: "Missing reference" }, { status: 400 });
  }

  const db = ensureDB();
  const idx = db.findIndex((p) => p.reference === reference);

  if (idx >= 0) {
    // Update existing record
    db[idx] = { ...db[idx], status };
  } else {
    // If we didn't create it locally (e.g., mobile SDK init), create a minimal record
    const studentId =
      (data?.metadata?.studentId && String(data.metadata.studentId)) ||
      (data?.customer?.email && String(data.customer.email).split("@")[0]) ||
      "UNKNOWN";
    const amount =
      typeof data?.amount === "number" && Number.isFinite(data.amount) ? Math.round(data.amount / 100) : 0;

    db.push({
      id:
        (data?.metadata?.paymentId && String(data.metadata.paymentId)) ||
        `PMT_${reference.replace(/[^a-zA-Z0-9]/g, "")}`,
      studentId,
      amount,
      status,
      createdAt: new Date().toISOString(),
      reference,
    });
  }

  // Always return 200 to acknowledge receipt once processed
  return NextResponse.json({ ok: true }, { status: 200 });
}
