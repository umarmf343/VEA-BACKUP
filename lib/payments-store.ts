import { randomUUID } from "crypto"

import { readPersistentState, resetPersistentState, writePersistentState } from "./persistent-state"

export type PaymentStatus = "pending" | "paid" | "failed"

export const PAYMENT_STATUS: Record<PaymentStatus, PaymentStatus> = {
  pending: "pending",
  paid: "paid",
  failed: "failed",
}

export interface PaymentRecord {
  id: string
  studentId: string
  amount: number
  status: PaymentStatus
  createdAt: string
  reference?: string
  verifiedAt?: string
  paidAt?: string
  updatedAt?: string
}

const STORE_KEY = "payments.store"

let cache: PaymentRecord[] | null = null

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function seedPayments(): PaymentRecord[] {
  const now = Date.now()
  return [
    {
      id: "pmt_001",
      studentId: "STU-1001",
      amount: 15000,
      status: "pending",
      createdAt: new Date(now - 15 * 60_000).toISOString(),
      reference: "REF-001",
    },
    {
      id: "pmt_002",
      studentId: "STU-1002",
      amount: 32000,
      status: "paid",
      createdAt: new Date(now - 6 * 3_600_000).toISOString(),
      reference: "REF-002",
      verifiedAt: new Date(now - 5 * 3_600_000).toISOString(),
      paidAt: new Date(now - 5 * 3_600_000).toISOString(),
    },
    {
      id: "pmt_003",
      studentId: "STU-1003",
      amount: 25000,
      status: "failed",
      createdAt: new Date(now - 2 * 24 * 3_600_000).toISOString(),
      reference: "REF-003",
    },
  ]
}

function getStore(): PaymentRecord[] {
  if (!cache) {
    cache = readPersistentState<PaymentRecord[]>(STORE_KEY, () => seedPayments())
  }
  return cache
}

function persistStore() {
  if (cache) {
    writePersistentState(STORE_KEY, cache)
  }
}

export function listPayments(status?: PaymentStatus): PaymentRecord[] {
  const store = getStore()
  const items = status ? store.filter((payment) => payment.status === status) : [...store]
  return clone(items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
}

function findPaymentOrThrow(id: string): [PaymentRecord[], number, PaymentRecord] {
  const store = getStore()
  const index = store.findIndex((payment) => payment.id === id)
  if (index === -1) {
    throw new Error("Payment not found")
  }
  return [store, index, store[index]]
}

function ensureReference(payment: PaymentRecord) {
  if (payment.reference && payment.reference.trim()) {
    return payment.reference
  }
  const suffix = payment.id.slice(-4).toUpperCase()
  const generated = `REF-${suffix}-${randomUUID().slice(0, 4).toUpperCase()}`
  payment.reference = generated
  return generated
}

export function verifyPayment(id: string): PaymentRecord {
  const [store, index, existing] = findPaymentOrThrow(id)
  const now = new Date().toISOString()
  const reference = ensureReference(existing)

  const updated: PaymentRecord = {
    ...existing,
    status: existing.status === "failed" ? "pending" : existing.status,
    reference,
    verifiedAt: now,
    updatedAt: now,
  }

  store[index] = updated
  persistStore()
  return clone(updated)
}

export interface MarkPaymentResult {
  payment: PaymentRecord
  wasPreviouslyVerified: boolean
}

export function markPaymentAsPaid(id: string): MarkPaymentResult {
  const [store, index, existing] = findPaymentOrThrow(id)
  const now = new Date().toISOString()
  const reference = ensureReference(existing)
  const wasPreviouslyVerified = Boolean(existing.verifiedAt)

  const updated: PaymentRecord = {
    ...existing,
    status: "paid",
    reference,
    verifiedAt: existing.verifiedAt ?? now,
    paidAt: now,
    updatedAt: now,
  }

  store[index] = updated
  persistStore()
  return { payment: clone(updated), wasPreviouslyVerified }
}

export function appendPayment(record: PaymentRecord) {
  const store = getStore()
  store.push({ ...record })
  persistStore()
}

export function resetPaymentsStore() {
  cache = null
  resetPersistentState(STORE_KEY)
}

export function __setPaymentsForTests(payments: PaymentRecord[]) {
  cache = payments.map((payment) => ({ ...payment }))
  persistStore()
}
