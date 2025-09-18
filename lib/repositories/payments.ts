import type { PaymentStatus, Prisma } from "@prisma/client"
import { PaymentStatus as PaymentStatusEnum, Prisma as PrismaNamespace } from "@prisma/client"

import { prisma } from "../prisma"

export type CreatePaymentInput = {
  studentId: string
  amount: number | string
  status?: PaymentStatus
  method: string
  reference: string
  term: string
  description?: string | null
  paidAt?: string | Date | null
  metadata?: Prisma.JsonValue
}

export type CreateReceiptInput = {
  paymentId: string
  issuedTo: string
  amount: number | string
  items: Prisma.JsonValue
  issuedAt?: string | Date
}

function decimalToNumber(value: PrismaNamespace.Decimal | null | undefined) {
  return value ? Number(value.toString()) : null
}

export async function listPayments() {
  const payments = await prisma.payment.findMany({
    include: { student: true, receipts: true },
    orderBy: { createdAt: "desc" },
  })

  return payments.map((payment) => ({
    ...payment,
    amount: decimalToNumber(payment.amount) ?? 0,
    receipts: payment.receipts.map((receipt) => ({
      ...receipt,
      amount: decimalToNumber(receipt.amount) ?? 0,
    })),
  }))
}

export async function createPayment(data: CreatePaymentInput) {
  const payment = await prisma.payment.create({
    data: {
      student: { connect: { id: data.studentId } },
      amount: new PrismaNamespace.Decimal(data.amount),
      status: data.status ?? PaymentStatusEnum.PENDING,
      method: data.method,
      reference: data.reference,
      term: data.term,
      description: data.description ?? undefined,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      metadata: data.metadata ?? undefined,
    },
    include: { student: true, receipts: true },
  })

  return {
    ...payment,
    amount: decimalToNumber(payment.amount) ?? 0,
  }
}

export async function listReceipts() {
  const receipts = await prisma.receipt.findMany({
    include: { payment: { include: { student: true } } },
    orderBy: { issuedAt: "desc" },
  })

  return receipts.map((receipt) => ({
    ...receipt,
    amount: decimalToNumber(receipt.amount) ?? 0,
  }))
}

export async function createReceipt(data: CreateReceiptInput) {
  const receipt = await prisma.receipt.create({
    data: {
      payment: { connect: { id: data.paymentId } },
      issuedTo: data.issuedTo,
      amount: new PrismaNamespace.Decimal(data.amount),
      items: data.items,
      issuedAt: data.issuedAt ? new Date(data.issuedAt) : undefined,
    },
    include: { payment: { include: { student: true } } },
  })

  return {
    ...receipt,
    amount: decimalToNumber(receipt.amount) ?? 0,
  }
}
