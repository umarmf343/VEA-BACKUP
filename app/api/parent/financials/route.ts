import { NextRequest, NextResponse } from "next/server";

import { listParentFinancialAccounts, recordParentPayment } from "@/lib/parent-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const accounts = listParentFinancialAccounts();
    return NextResponse.json({ accounts });
  } catch (error) {
    console.error("Failed to load parent financials", error);
    return NextResponse.json({ error: "Unable to load financial overview." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payment = recordParentPayment({
      studentId: body?.studentId,
      amount: Number(body?.amount ?? 0),
      method: body?.method,
      notes: body?.notes,
    });
    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    console.error("Failed to record parent payment", error);
    return NextResponse.json({ error: error?.message ?? "Unable to process payment." }, { status: 400 });
  }
}
