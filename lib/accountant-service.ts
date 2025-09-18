import { DatabaseManager, type FeeStructure, type Payment, type PaymentStatus, type Receipt, type Student } from "./database-manager"

export type PaymentMethod = "bank_transfer" | "cash" | "card" | "online" | "offline"

export interface AccountantProfile {
  id: string
  name: string
  email: string
  phone: string
  extension: string
  officeLocation: string
  lastLogin: string
}

export interface AccountantFinancialSnapshot {
  totalRevenue: number
  pendingPayments: number
  receiptsIssued: number
  collectionRate: number
  outstandingBalance: number
}

export interface AccountantPaymentRecord extends Payment {
  studentName: string
  studentClass: string
  typeLabel: string
  methodLabel: string
}

export interface AccountantReceiptRecord extends Receipt {
  studentName: string
  reference: string
  issuedDate: string
  methodLabel: string
  amountLabel: string
}

export interface SimplifiedStudent {
  id: string
  name: string
  class: string
}

export interface RecordPaymentInput {
  studentId: string
  amount: number
  method: PaymentMethod
  status?: PaymentStatus
  description?: string
  term?: string
  generateReceipt?: boolean
}

export interface FeeStructureInput {
  id?: string
  class: string
  tuition: number
  development: number
  exam: number
  sports: number
  library: number
}

const db = DatabaseManager.getInstance()

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  card: "Card",
  online: "Online Portal",
  offline: "Offline",
}

function titleCase(value: string) {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function getMethodLabel(method: string) {
  return PAYMENT_METHOD_LABELS[method] ?? titleCase(method)
}

function createStudentLookup(students: Student[]) {
  return new Map(students.map((student) => [student.id, student]))
}

export function enrichPayments(payments: Payment[], students: Student[]): AccountantPaymentRecord[] {
  const studentLookup = createStudentLookup(students)

  return payments.map((payment) => {
    const student = studentLookup.get(payment.studentId)

    return {
      ...payment,
      studentName: student?.name ?? "Unknown Student",
      studentClass: student?.class ?? "—",
      typeLabel: payment.description ?? titleCase(payment.term ?? "Tuition"),
      methodLabel: getMethodLabel(payment.method ?? "cash"),
    }
  })
}

export function enrichReceipts(
  receipts: Receipt[],
  payments: Payment[],
  students: Student[],
): AccountantReceiptRecord[] {
  const studentLookup = createStudentLookup(students)
  const paymentLookup = new Map(payments.map((payment) => [payment.id, payment]))

  return receipts.map((receipt) => {
    const payment = paymentLookup.get(receipt.paymentId)
    const student = studentLookup.get(receipt.issuedTo ?? payment?.studentId ?? "")

    const amount = receipt.amount ?? payment?.amount ?? 0

    return {
      ...receipt,
      studentName: student?.name ?? "Unknown Student",
      reference: payment?.reference ?? receipt.id,
      issuedDate: payment?.date ?? receipt.issuedAt,
      methodLabel: payment ? getMethodLabel(payment.method ?? "cash") : "—",
      amountLabel: new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }).format(amount),
    }
  })
}

export async function getAccountantProfile(): Promise<AccountantProfile> {
  return {
    id: "usr-accountant-1",
    name: "Ngozi Eze",
    email: "accountant@vea.edu.ng",
    phone: "+234 803 555 0192",
    extension: "1203",
    officeLocation: "Finance Wing, Level 2",
    lastLogin: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  }
}

export async function getAccountantFinancialSnapshot(): Promise<AccountantFinancialSnapshot> {
  const [payments, receipts] = await Promise.all([db.getPayments(), db.getReceipts()])
  const paidPayments = payments.filter((payment) => payment.status === "paid")
  const pendingPayments = payments.filter((payment) => payment.status === "pending").length
  const outstandingBalance = payments
    .filter((payment) => payment.status !== "paid")
    .reduce((sum, payment) => sum + payment.amount, 0)
  const totalRevenue = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const collectionRate = payments.length
    ? Math.round((paidPayments.length / payments.length) * 1000) / 10
    : 0

  return {
    totalRevenue,
    pendingPayments,
    receiptsIssued: receipts.length,
    collectionRate,
    outstandingBalance,
  }
}

export async function listAccountantStudents(): Promise<SimplifiedStudent[]> {
  const students = await db.getStudents()
  return students
    .map((student) => ({
      id: student.id,
      name: student.name,
      class: student.class,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function listAccountantPayments(): Promise<AccountantPaymentRecord[]> {
  const [payments, students] = await Promise.all([db.getPayments(), db.getStudents()])
  return enrichPayments(payments, students)
}

export async function listAccountantReceipts(): Promise<AccountantReceiptRecord[]> {
  const [receipts, payments, students] = await Promise.all([
    db.getReceipts(),
    db.getPayments(),
    db.getStudents(),
  ])

  return enrichReceipts(receipts, payments, students)
}

export async function listAccountantFeeStructure(): Promise<FeeStructure[]> {
  return db.getFeeStructure()
}

export async function recordAccountantPayment(input: RecordPaymentInput) {
  const payment = await db.savePayment({
    studentId: input.studentId,
    amount: input.amount,
    method: input.method,
    status: input.status ?? "paid",
    description: input.description ?? "School Fees",
    term: input.term ?? `${new Date().getFullYear()}-term-2`,
  })

  if (input.generateReceipt ?? true) {
    await db.generateReceipt(payment)
  }

  return payment
}

export async function saveAccountantFeeStructure(input: FeeStructureInput) {
  return db.saveFeeStructure({
    id: input.id,
    class: input.class,
    tuition: input.tuition,
    development: input.development,
    exam: input.exam,
    sports: input.sports,
    library: input.library,
  })
}

export async function generateAccountantReport(type: string) {
  const payments = await db.getPayments()
  return db.generateFinancialReport(type, payments)
}
