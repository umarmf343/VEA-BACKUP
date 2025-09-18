import { NextRequest, NextResponse } from "next/server"

import {
  enrichPayments,
  listAccountantPayments,
  recordAccountantPayment,
  type PaymentMethod,
} from "@/lib/accountant-service"
import { DatabaseManager, type PaymentStatus } from "@/lib/database-manager"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const VALID_PAYMENT_METHODS = new Set<PaymentMethod>([
  "bank_transfer",
  "cash",
  "card",
  "online",
  "offline",
])

const VALID_PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"]

function parseNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  return NaN
}

function normalisePaymentMethod(value: unknown): PaymentMethod | null {
  if (typeof value !== "string") {
    return null
  }

  const normalised = value.trim().toLowerCase().replace(/\s+/g, "_") as PaymentMethod
  return VALID_PAYMENT_METHODS.has(normalised) ? normalised : null
}

function normalisePaymentStatus(value: unknown): PaymentStatus | null {
  if (typeof value !== "string") {
    return null
  }

  const normalised = value.trim().toLowerCase() as PaymentStatus
  return VALID_PAYMENT_STATUSES.includes(normalised) ? normalised : null
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const studentId = params.get("studentId")?.trim()
    const statusParam = params.get("status")
    const methodParam = params.get("method")

    const status = statusParam ? normalisePaymentStatus(statusParam) : null
    if (statusParam && !status) {
      return NextResponse.json({ error: "Invalid payment status filter" }, { status: 400 })
    }

    const method = methodParam ? normalisePaymentMethod(methodParam) : null
    if (methodParam && !method) {
      return NextResponse.json({ error: "Invalid payment method filter" }, { status: 400 })
    }

    const payments = await listAccountantPayments()
    const filtered = payments.filter((payment) => {
      if (studentId && payment.studentId !== studentId) {
        return false
      }

      if (status && payment.status !== status) {
        return false
      }

      if (method && payment.method !== method) {
        return false
      }

      return true
    })

    return NextResponse.json({ payments: filtered })
  } catch (error) {
    console.error("Failed to load accountant payments", error)
    return NextResponse.json({ error: "Unable to load payments." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>

    const studentIdRaw = body.studentId
    if (typeof studentIdRaw !== "string" || !studentIdRaw.trim()) {
      return NextResponse.json({ error: "A valid studentId is required." }, { status: 400 })
    }
    const studentId = studentIdRaw.trim()

    const amountRaw = body.amount
    const amount = parseNumber(amountRaw)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 })
    }

    const method = normalisePaymentMethod(body.method)
    if (!method) {
      return NextResponse.json({ error: "A valid payment method is required." }, { status: 400 })
    }

    const status = body.status ? normalisePaymentStatus(body.status) ?? undefined : undefined
    if (body.status && !status) {
      return NextResponse.json({ error: "Invalid payment status provided." }, { status: 400 })
    }

    const descriptionRaw = typeof body.description === "string" ? body.description.trim() : ""
    const description = descriptionRaw ? descriptionRaw : undefined
    const termRaw = typeof body.term === "string" ? body.term.trim() : ""
    const term = termRaw ? termRaw : undefined
    const generateReceipt = body.generateReceipt === undefined ? true : Boolean(body.generateReceipt)

    const db = DatabaseManager.getInstance()
    const students = await db.getStudents()
    const studentExists = students.some((student) => student.id === studentId)
    if (!studentExists) {
      return NextResponse.json({ error: "Student not found." }, { status: 404 })
    }

    const payment = await recordAccountantPayment({
      studentId,
      amount,
      method,
      status,
      description,
      term,
      generateReceipt,
    })

    const receipts = await db.getReceipts()
    const receipt = generateReceipt
      ? receipts.find((item) => item.paymentId === payment.id) ?? null
      : null

    const [enrichedPayment] = enrichPayments([payment], students)

    return NextResponse.json(
      {
        payment: enrichedPayment,
        receipt,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Failed to record accountant payment", error)
    return NextResponse.json({ error: "Unable to record payment." }, { status: 500 })
  }
}
