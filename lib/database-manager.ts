import { randomUUID } from "crypto"

import type {
  Assignment as PrismaAssignment,
  AssignmentSubmission as PrismaAssignmentSubmission,
  Class as PrismaClass,
  Student as PrismaStudent,
  User as PrismaUser,
} from "@prisma/client"
import {
  StudentPaymentStatus as PrismaStudentPaymentStatus,
  StudentStatus as PrismaStudentStatus,
  SubmissionStatus,
  UserRole,
  UserStatus,
} from "@prisma/client"

import { safeStorage } from "./safe-storage"
import {
  assignmentRepository,
  auditLogRepository,
  classRepository,
  paymentRepository,
  studentRepository,
  userRepository,
} from "./repositories"
import type { NormalisedPayment, NormalisedReceipt } from "./repositories/payments"

export type PaymentStatus = "pending" | "paid" | "failed"
export type StudentPaymentStatus = "paid" | "pending" | "overdue"
export type StudentStatus = "active" | "inactive"

export interface StudentGrade {
  subject: string
  ca1: number
  ca2: number
  exam: number
  total: number
  grade: string
}

export interface Student {
  id: string
  name: string
  email: string
  class: string
  section: string
  admissionNumber: string
  parentName: string
  parentEmail: string
  paymentStatus: StudentPaymentStatus
  status: StudentStatus
  dateOfBirth: string
  address: string
  phone: string
  guardianPhone: string
  bloodGroup: string
  admissionDate: string
  subjects: string[]
  attendance: { present: number; total: number }
  grades: StudentGrade[]
  photoUrl?: string
}

export interface ClassRecord {
  id: string
  name: string
  level: string
  capacity: number
  classTeacherId?: string
  subjects: string[]
  status: "active" | "inactive"
}

export interface Payment {
  id: string
  studentId: string
  amount: number
  status: PaymentStatus
  method: string
  date: string
  reference: string
  description?: string
  term: string
}

export interface Receipt {
  id: string
  paymentId: string
  issuedTo: string
  issuedAt: string
  amount: number
  items: { label: string; amount: number }[]
}

export interface FeeStructure {
  id: string
  class: string
  tuition: number
  development: number
  exam: number
  sports: number
  library: number
  total: number
  updatedAt: string
}

export interface Assignment {
  id: string
  title: string
  description: string
  subject: string
  classId: string
  teacherId: string
  dueDate: string
  status: "active" | "closed"
  createdAt: string
}

export interface AssignmentSubmission {
  id: string
  assignmentId: string
  studentId: string
  files: string[]
  status: "submitted" | "graded" | "pending"
  submittedAt: string
  grade?: string
  feedback?: string
}

export interface Book {
  id: string
  title: string
  author: string
  category: string
  copies: number
  availableCopies: number
  status: "available" | "unavailable"
}

export interface BorrowedBook {
  id: string
  bookId: string
  studentId: string
  borrowedAt: string
  dueDate: string
  status: "borrowed" | "returned"
  returnedAt?: string
}

export interface BookRequest {
  id: string
  bookId: string
  studentId: string
  status: "pending" | "approved" | "rejected"
  requestedAt: string
  updatedAt?: string
  approvedBy?: string
  rejectedBy?: string
}

export interface GradeRecord {
  id: string
  studentId: string
  classId: string
  subject: string
  term: string
  ca1: number
  ca2: number
  exam: number
  total: number
  grade: string
  remarks?: string
  teacherId?: string
}

export interface AnalyticsReport {
  id: string
  title: string
  term: string
  classId: string
  summary: string
  createdAt: string
  classPerformance: Array<{ class: string; average: number; passRate: number; students: number }>
  subjectPerformance: Array<{ subject: string; average: number; highest: number; lowest: number }>
  termComparison: Array<{ term: string; average: number }>
  topPerformers: Array<{ studentId: string; name: string; average: number }>
  performanceRadarData: Array<{ subject: string; current: number; previous: number }>
  summaryStats: { overallAverage: number; totalStudents: number; passRate: number; excellenceRate: number }
}

export interface PromotionAnalysis {
  id: string
  classId: string
  createdAt: string
  summary: string
  recommendations: Array<{
    studentId: string
    status: "eligible" | "review" | "repeat"
    remarks?: string
  }>
}

export interface BatchPromotion {
  id: string
  fromClass: string
  toClass: string
  promotedStudentIds: string[]
  createdAt: string
  performedBy: string
}

export interface FinancialReport {
  id: string
  type: string
  generatedAt: string
  totals: { revenue: number; expenses: number; outstanding: number }
  notes?: string
}

export interface FinancialSummary {
  period: string
  totalCollected: number
  totalExpected: number
  outstanding: number
  expenses: number
}

export interface FeeDefaulter {
  id: string
  name: string
  class: string
  amountOwed: number
  lastPaymentDate?: string
}

export interface AcademicSubjectPerformance {
  subject: string
  totalPercentage: number
  totalScore: number
  grade: string
}

export interface AttendanceSummary {
  presentDays: number
  totalDays: number
  percentage: number
}

export interface UserRecord {
  id: string
  name: string
  email: string
  role: string
  status: StudentStatus
  createdAt: string
  updatedAt?: string
  passwordHash?: string
  studentIds?: string[]
  subjects?: string[]
}

type Collections = {
  students: Student[]
  classes: ClassRecord[]
  users: UserRecord[]
  payments: Payment[]
  receipts: Receipt[]
  feeStructure: FeeStructure[]
  assignments: Assignment[]
  assignmentSubmissions: AssignmentSubmission[]
  books: Book[]
  borrowedBooks: BorrowedBook[]
  bookRequests: BookRequest[]
  grades: GradeRecord[]
  analyticsReports: AnalyticsReport[]
  financialReports: FinancialReport[]
  promotionAnalyses: PromotionAnalysis[]
  batchPromotions: BatchPromotion[]
}

type CollectionKey = keyof Collections

type DatabaseEventMap = {
  studentCreated: Student
  studentUpdated: Student
  studentDeleted: { id: string }
  marksUpdated: { studentId?: string }
  attendanceUpdated: { studentId?: string }
  financialDataUpdated: FinancialSummary
  paymentProcessed: Payment
  expenseAdded: { amount: number; category: string; recordedAt: string }
  academicDataUpdated: { classId?: string; term?: string }
  reportCardUpdated: { studentId?: string }
  analyticsReportSaved: AnalyticsReport
  libraryBookRenewed: { bookId: string; studentId: string }
  studentPromoted: { studentId: string; promotion: PromotionAnalysis }
  batchPromotionCompleted: BatchPromotion
}

type EventName = keyof DatabaseEventMap

type Listener<T> = (payload: T) => void

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value)
  }
  return JSON.parse(JSON.stringify(value))
}

function mapUserEntity(user: PrismaUser): UserRecord {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    status: user.status === UserStatus.INACTIVE ? "inactive" : "active",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    passwordHash: user.passwordHash ?? undefined,
    studentIds: Array.isArray((user.metadata as any)?.studentIds)
      ? ((user.metadata as any).studentIds as string[])
      : undefined,
    subjects: Array.isArray((user.metadata as any)?.subjects)
      ? ((user.metadata as any).subjects as string[])
      : undefined,
  }
}

function parseUserRole(role: string): UserRole {
  const candidate = role?.toUpperCase?.()
  return (Object.values(UserRole) as string[]).includes(candidate)
    ? (candidate as UserRole)
    : UserRole.STUDENT
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item))
  }
  return []
}

function parseAttendance(value: unknown): { present: number; total: number } {
  if (value && typeof value === "object") {
    const { present, total } = value as Record<string, unknown>
    const presentNum = typeof present === "number" ? present : Number(present ?? 0)
    const totalNum = typeof total === "number" ? total : Number(total ?? 0)
    return { present: presentNum, total: totalNum }
  }
  return { present: 0, total: 0 }
}

function parseGrades(value: unknown): StudentGrade[] {
  if (Array.isArray(value)) {
    return (value as any[]).map((grade) => ({
      subject: String(grade?.subject ?? ""),
      ca1: Number(grade?.ca1 ?? 0),
      ca2: Number(grade?.ca2 ?? 0),
      exam: Number(grade?.exam ?? 0),
      total: Number(grade?.total ?? 0),
      grade: String(grade?.grade ?? ""),
    }))
  }
  return []
}

function mapStudentEntity(student: PrismaStudent & { class?: PrismaClass | null }): Student {
  return {
    id: student.id,
    name: student.name,
    email: student.email,
    class: student.class?.name ?? student.classId ?? "",
    section: student.section ?? "",
    admissionNumber: student.admissionNumber,
    parentName: student.parentName ?? "",
    parentEmail: student.parentEmail ?? "",
    paymentStatus:
      student.paymentStatus === PrismaStudentPaymentStatus.PAID
        ? "paid"
        : student.paymentStatus === PrismaStudentPaymentStatus.OVERDUE
          ? "overdue"
          : "pending",
    status: student.status === PrismaStudentStatus.INACTIVE ? "inactive" : "active",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.toISOString() : "",
    address: student.address ?? "",
    phone: student.phone ?? "",
    guardianPhone: student.guardianPhone ?? "",
    bloodGroup: student.bloodGroup ?? "",
    admissionDate: student.admissionDate ? student.admissionDate.toISOString() : "",
    subjects: parseStringArray(student.subjects),
    attendance: parseAttendance(student.attendance),
    grades: parseGrades(student.grades),
    photoUrl: student.photoUrl ?? undefined,
  }
}

function mapClassEntity(classEntity: PrismaClass): ClassRecord {
  return {
    id: classEntity.id,
    name: classEntity.name,
    level: classEntity.level ?? "",
    capacity: classEntity.capacity ?? 0,
    classTeacherId: classEntity.teacherId ?? undefined,
    subjects: parseStringArray(classEntity.subjects),
    status: classEntity.status === "INACTIVE" ? "inactive" : "active",
  }
}

function mapAssignmentStatus(status: string): Assignment["status"] {
  return status === "CLOSED" ? "closed" : "active"
}

function mapSubmissionStatus(status: SubmissionStatus): AssignmentSubmission["status"] {
  switch (status) {
    case SubmissionStatus.GRADED:
      return "graded"
    case SubmissionStatus.SUBMITTED:
      return "submitted"
    default:
      return "pending"
  }
}

function mapAssignmentEntity(
  assignment: PrismaAssignment & { submissions?: PrismaAssignmentSubmission[] }
): Assignment {
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    subject: assignment.subject,
    classId: assignment.classId,
    teacherId: assignment.teacherId,
    dueDate: assignment.dueDate.toISOString(),
    status: mapAssignmentStatus(assignment.status),
    createdAt: assignment.createdAt.toISOString(),
  }
}

function mapSubmissionEntity(submission: PrismaAssignmentSubmission): AssignmentSubmission {
  return {
    id: submission.id,
    assignmentId: submission.assignmentId,
    studentId: submission.studentId,
    files: submission.files ?? [],
    status: mapSubmissionStatus(submission.status),
    submittedAt: submission.submittedAt ? submission.submittedAt.toISOString() : "",
    grade: submission.grade ?? undefined,
    feedback: submission.feedback ?? undefined,
  }
}

function mapPaymentStatus(status: string): PaymentStatus {
  switch (status) {
    case "PAID":
      return "paid"
    case "FAILED":
      return "failed"
    default:
      return "pending"
  }
}

function mapPaymentEntity(payment: NormalisedPayment): Payment {
  return {
    id: payment.id,
    studentId: payment.studentId,
    amount: payment.amount,
    status: mapPaymentStatus(payment.status),
    method: payment.method,
    date: payment.paidAt ? payment.paidAt.toISOString() : payment.createdAt.toISOString(),
    reference: payment.reference,
    description: payment.description ?? undefined,
    term: payment.term,
  }
}

function mapReceiptEntity(receipt: NormalisedReceipt): Receipt {
  return {
    id: receipt.id,
    paymentId: receipt.paymentId,
    issuedTo: receipt.issuedTo,
    issuedAt: receipt.issuedAt.toISOString(),
    amount: receipt.amount,
    items: Array.isArray(receipt.items)
      ? (receipt.items as Array<{ label: string; amount: number }>).map((item) => ({
          label: String(item.label),
          amount: Number(item.amount),
        }))
      : [],
  }
}

const DEFAULT_DATA: Collections = {
  students: [
    {
      id: "std-001",
      name: "Amaka Obi",
      email: "amaka.obi@student.vea.edu.ng",
      class: "JSS 1A",
      section: "A",
      admissionNumber: "VEA-2025-001",
      parentName: "Ngozi Obi",
      parentEmail: "ngozi.obi@example.com",
      paymentStatus: "paid",
      status: "active",
      dateOfBirth: "2012-04-18",
      address: "12 Unity Close, Enugu",
      phone: "+2348012345678",
      guardianPhone: "+2348098765432",
      bloodGroup: "O+",
      admissionDate: "2021-09-01",
      subjects: ["Mathematics", "English", "Basic Science"],
      attendance: { present: 72, total: 80 },
      grades: [
        { subject: "Mathematics", ca1: 18, ca2: 17, exam: 56, total: 91, grade: "A" },
        { subject: "English", ca1: 16, ca2: 18, exam: 54, total: 88, grade: "A" },
        { subject: "Basic Science", ca1: 15, ca2: 17, exam: 50, total: 82, grade: "B" },
      ],
    },
    {
      id: "std-002",
      name: "Tunde Adebayo",
      email: "tunde.adebayo@student.vea.edu.ng",
      class: "JSS 2A",
      section: "A",
      admissionNumber: "VEA-2025-014",
      parentName: "Kunle Adebayo",
      parentEmail: "kunle.adebayo@example.com",
      paymentStatus: "pending",
      status: "active",
      dateOfBirth: "2011-11-05",
      address: "45 Victory Road, Lagos",
      phone: "+2348023456789",
      guardianPhone: "+2348076543210",
      bloodGroup: "B+",
      admissionDate: "2020-09-01",
      subjects: ["Mathematics", "English", "Agricultural Science"],
      attendance: { present: 65, total: 80 },
      grades: [
        { subject: "Mathematics", ca1: 15, ca2: 14, exam: 48, total: 77, grade: "B" },
        { subject: "English", ca1: 16, ca2: 15, exam: 50, total: 81, grade: "B" },
        { subject: "Agricultural Science", ca1: 17, ca2: 15, exam: 49, total: 81, grade: "B" },
      ],
    },
    {
      id: "std-003",
      name: "Zara Hassan",
      email: "zara.hassan@student.vea.edu.ng",
      class: "SS 1A",
      section: "Science",
      admissionNumber: "VEA-2025-028",
      parentName: "Halima Hassan",
      parentEmail: "halima.hassan@example.com",
      paymentStatus: "overdue",
      status: "active",
      dateOfBirth: "2009-02-22",
      address: "8 Crescent Avenue, Abuja",
      phone: "+2348039876543",
      guardianPhone: "+2348065432198",
      bloodGroup: "A-",
      admissionDate: "2019-09-01",
      subjects: ["Mathematics", "Physics", "Chemistry"],
      attendance: { present: 58, total: 80 },
      grades: [
        { subject: "Mathematics", ca1: 14, ca2: 15, exam: 46, total: 75, grade: "B" },
        { subject: "Physics", ca1: 13, ca2: 14, exam: 44, total: 71, grade: "C" },
        { subject: "Chemistry", ca1: 16, ca2: 15, exam: 47, total: 78, grade: "B" },
      ],
    },
  ],
  classes: [
    {
      id: "cls-jss1a",
      name: "JSS 1A",
      level: "Junior Secondary",
      capacity: 35,
      classTeacherId: "usr-teacher-1",
      subjects: ["Mathematics", "English", "Basic Science"],
      status: "active",
    },
    {
      id: "cls-jss2a",
      name: "JSS 2A",
      level: "Junior Secondary",
      capacity: 35,
      classTeacherId: "usr-teacher-2",
      subjects: ["Mathematics", "English", "Agricultural Science"],
      status: "active",
    },
    {
      id: "cls-ss1a",
      name: "SS 1A",
      level: "Senior Secondary",
      capacity: 45,
      classTeacherId: "usr-teacher-3",
      subjects: ["Mathematics", "Physics", "Chemistry"],
      status: "active",
    },
  ],
  users: [
    {
      id: "usr-admin-1",
      name: "Victoria Umeh",
      email: "admin@vea.edu.ng",
      role: "admin",
      status: "active",
      createdAt: "2024-01-10T08:00:00.000Z",
    },
    {
      id: "usr-teacher-1",
      name: "Samuel Eze",
      email: "samuel.eze@vea.edu.ng",
      role: "teacher",
      status: "active",
      createdAt: "2024-01-12T08:00:00.000Z",
      subjects: ["Mathematics", "Further Mathematics"],
    },
    {
      id: "usr-teacher-2",
      name: "Grace Adeniyi",
      email: "grace.adeniyi@vea.edu.ng",
      role: "teacher",
      status: "active",
      createdAt: "2024-01-12T08:00:00.000Z",
      subjects: ["English", "Literature"],
    },
    {
      id: "usr-accountant-1",
      name: "Peter Okon",
      email: "peter.okon@vea.edu.ng",
      role: "accountant",
      status: "active",
      createdAt: "2024-02-01T08:00:00.000Z",
    },
    {
      id: "usr-parent-1",
      name: "Ngozi Obi",
      email: "ngozi.obi@example.com",
      role: "parent",
      status: "active",
      createdAt: "2024-03-01T08:00:00.000Z",
      studentIds: ["std-001"],
    },
  ],
  payments: [
    {
      id: "pay-001",
      studentId: "std-001",
      amount: 250000,
      status: "paid",
      method: "bank_transfer",
      date: "2024-01-15T10:30:00.000Z",
      reference: "PAY-2024-001",
      description: "Term 2 school fees",
      term: "2024-term-2",
    },
    {
      id: "pay-002",
      studentId: "std-002",
      amount: 240000,
      status: "pending",
      method: "cash",
      date: "2024-02-02T09:00:00.000Z",
      reference: "PAY-2024-002",
      description: "Term 2 school fees",
      term: "2024-term-2",
    },
    {
      id: "pay-003",
      studentId: "std-003",
      amount: 380000,
      status: "paid",
      method: "card",
      date: "2024-01-20T11:15:00.000Z",
      reference: "PAY-2024-003",
      description: "Term 2 science levy",
      term: "2024-term-2",
    },
  ],
  receipts: [
    {
      id: "rcpt-001",
      paymentId: "pay-001",
      issuedTo: "std-001",
      issuedAt: "2024-01-15T10:45:00.000Z",
      amount: 250000,
      items: [
        { label: "Tuition", amount: 180000 },
        { label: "Development Levy", amount: 40000 },
        { label: "Sports", amount: 30000 },
      ],
    },
    {
      id: "rcpt-003",
      paymentId: "pay-003",
      issuedTo: "std-003",
      issuedAt: "2024-01-20T11:20:00.000Z",
      amount: 380000,
      items: [
        { label: "Tuition", amount: 250000 },
        { label: "Science Lab", amount: 80000 },
        { label: "Library", amount: 50000 },
      ],
    },
  ],
  feeStructure: [
    {
      id: "fee-jss1",
      class: "JSS 1A",
      tuition: 180000,
      development: 40000,
      exam: 20000,
      sports: 15000,
      library: 10000,
      total: 265000,
      updatedAt: "2024-01-05T08:00:00.000Z",
    },
    {
      id: "fee-jss2",
      class: "JSS 2A",
      tuition: 185000,
      development: 45000,
      exam: 22000,
      sports: 15000,
      library: 10000,
      total: 277000,
      updatedAt: "2024-01-05T08:00:00.000Z",
    },
    {
      id: "fee-ss1",
      class: "SS 1A",
      tuition: 250000,
      development: 60000,
      exam: 25000,
      sports: 20000,
      library: 15000,
      total: 370000,
      updatedAt: "2024-01-05T08:00:00.000Z",
    },
  ],
  assignments: [
    {
      id: "assign-001",
      title: "Algebra Revision",
      description: "Solve the attached algebra problems and submit solutions.",
      subject: "Mathematics",
      classId: "cls-jss1a",
      teacherId: "usr-teacher-1",
      dueDate: "2024-02-28",
      status: "active",
      createdAt: "2024-02-10T09:00:00.000Z",
    },
    {
      id: "assign-002",
      title: "Agricultural Practices",
      description: "Write a report on modern agricultural techniques used in Nigeria.",
      subject: "Agricultural Science",
      classId: "cls-jss2a",
      teacherId: "usr-teacher-2",
      dueDate: "2024-03-05",
      status: "active",
      createdAt: "2024-02-12T09:00:00.000Z",
    },
  ],
  assignmentSubmissions: [
    {
      id: "sub-001",
      assignmentId: "assign-001",
      studentId: "std-001",
      files: ["https://files.vea.edu.ng/submissions/std-001-algebra.pdf"],
      status: "graded",
      submittedAt: "2024-02-20T14:30:00.000Z",
      grade: "A",
      feedback: "Excellent work with detailed explanations.",
    },
  ],
  books: [
    {
      id: "book-001",
      title: "Advanced Mathematics for Junior Secondary",
      author: "A. Okafor",
      category: "Mathematics",
      copies: 12,
      availableCopies: 8,
      status: "available",
    },
    {
      id: "book-002",
      title: "Fundamentals of Physics",
      author: "H. Abiola",
      category: "Science",
      copies: 10,
      availableCopies: 4,
      status: "available",
    },
    {
      id: "book-003",
      title: "African Literature Anthology",
      author: "C. Emenike",
      category: "Literature",
      copies: 8,
      availableCopies: 8,
      status: "available",
    },
  ],
  borrowedBooks: [
    {
      id: "borrow-001",
      bookId: "book-001",
      studentId: "std-001",
      borrowedAt: "2024-02-01",
      dueDate: "2024-02-21",
      status: "borrowed",
    },
    {
      id: "borrow-002",
      bookId: "book-002",
      studentId: "std-002",
      borrowedAt: "2024-02-10",
      dueDate: "2024-03-01",
      status: "borrowed",
    },
  ],
  bookRequests: [
    {
      id: "req-001",
      bookId: "book-003",
      studentId: "std-003",
      status: "pending",
      requestedAt: "2024-02-18",
    },
    {
      id: "req-002",
      bookId: "book-001",
      studentId: "std-002",
      status: "approved",
      requestedAt: "2024-02-05",
      updatedAt: "2024-02-06",
    },
  ],
  grades: [
    {
      id: "grade-001",
      studentId: "std-001",
      classId: "cls-jss1a",
      subject: "Mathematics",
      term: "2024-term-2",
      ca1: 18,
      ca2: 17,
      exam: 56,
      total: 91,
      grade: "A",
    },
    {
      id: "grade-002",
      studentId: "std-001",
      classId: "cls-jss1a",
      subject: "English",
      term: "2024-term-2",
      ca1: 16,
      ca2: 18,
      exam: 54,
      total: 88,
      grade: "A",
    },
    {
      id: "grade-003",
      studentId: "std-002",
      classId: "cls-jss2a",
      subject: "Mathematics",
      term: "2024-term-2",
      ca1: 15,
      ca2: 14,
      exam: 48,
      total: 77,
      grade: "B",
    },
    {
      id: "grade-004",
      studentId: "std-003",
      classId: "cls-ss1a",
      subject: "Physics",
      term: "2024-term-2",
      ca1: 13,
      ca2: 14,
      exam: 44,
      total: 71,
      grade: "C",
    },
  ],
  analyticsReports: [
    {
      id: "analytics-001",
      title: "Term 1 Academic Performance",
      term: "2023-term-1",
      classId: "all",
      summary: "Overall academic performance improved by 6% compared to the previous term.",
      createdAt: "2023-12-15T10:00:00.000Z",
      classPerformance: [
        { class: "JSS 1", average: 78, passRate: 92, students: 120 },
        { class: "JSS 2", average: 75, passRate: 89, students: 115 },
        { class: "SS 1", average: 81, passRate: 94, students: 105 },
      ],
      subjectPerformance: [
        { subject: "Mathematics", average: 76, highest: 98, lowest: 42 },
        { subject: "English", average: 79, highest: 95, lowest: 48 },
        { subject: "Basic Science", average: 82, highest: 97, lowest: 55 },
      ],
      termComparison: [
        { term: "2022-term-3", average: 74 },
        { term: "2023-term-1", average: 78 },
      ],
      topPerformers: [
        { studentId: "std-001", name: "Amaka Obi", average: 91 },
        { studentId: "std-003", name: "Zara Hassan", average: 86 },
      ],
      performanceRadarData: [
        { subject: "Mathematics", current: 78, previous: 74 },
        { subject: "English", current: 82, previous: 79 },
        { subject: "Science", current: 84, previous: 80 },
      ],
      summaryStats: {
        overallAverage: 78,
        totalStudents: 340,
        passRate: 91,
        excellenceRate: 28,
      },
    },
  ],
  financialReports: [
    {
      id: "fin-report-001",
      type: "monthly",
      generatedAt: "2024-01-31T17:00:00.000Z",
      totals: { revenue: 1200000, expenses: 450000, outstanding: 320000 },
      notes: "Revenue increased by 12% compared to December.",
    },
  ],
  promotionAnalyses: [],
  batchPromotions: [],
}

export class DatabaseManager {
  private static instance: DatabaseManager | null = null

  private memoryStore = new Map<CollectionKey, string>()
  private collectionListeners = new Map<CollectionKey, Set<(value: Collections[CollectionKey]) => void>>()
  private eventListeners = new Map<EventName, Set<(payload: unknown) => void>>()

  constructor() {
    if (DatabaseManager.instance) {
      return DatabaseManager.instance
    }

    this.bootstrapDefaults()
    DatabaseManager.instance = this
  }

  static getInstance(): DatabaseManager {
    return new DatabaseManager()
  }

  private bootstrapDefaults() {
    ;(Object.keys(DEFAULT_DATA) as CollectionKey[]).forEach((key) => {
      const serialized = JSON.stringify(DEFAULT_DATA[key])
      if (!this.memoryStore.has(key)) {
        this.memoryStore.set(key, serialized)
      }
      try {
        const existing = safeStorage.getItem(this.storageKey(key))
        if (!existing) {
          safeStorage.setItem(this.storageKey(key), serialized)
        }
      } catch {
        // Ignore storage errors (e.g., during SSR)
      }
    })
  }

  private storageKey(key: CollectionKey) {
    return `vea:${key}`
  }

  private readRaw(key: CollectionKey): string | null {
    try {
      const value = safeStorage.getItem(this.storageKey(key))
      if (value !== null) {
        this.memoryStore.set(key, value)
        return value
      }
    } catch {
      // Ignore storage errors
    }

    return this.memoryStore.get(key) ?? null
  }

  private writeRaw(key: CollectionKey, value: string) {
    this.memoryStore.set(key, value)
    try {
      safeStorage.setItem(this.storageKey(key), value)
    } catch {
      // Ignore storage errors
    }
  }

  private getCollection<K extends CollectionKey>(key: K): Collections[K] {
    const raw = this.readRaw(key)
    if (!raw) {
      const fallback = DEFAULT_DATA[key]
      this.writeRaw(key, JSON.stringify(fallback))
      return clone(fallback)
    }

    try {
      return JSON.parse(raw) as Collections[K]
    } catch {
      const fallback = DEFAULT_DATA[key]
      this.writeRaw(key, JSON.stringify(fallback))
      return clone(fallback)
    }
  }

  private setCollection<K extends CollectionKey>(key: K, value: Collections[K]) {
    this.writeRaw(key, JSON.stringify(value))
    this.notifyCollection(key)
  }

  private updateCollection<K extends CollectionKey>(key: K, updater: (current: Collections[K]) => Collections[K]) {
    const current = this.getCollection(key)
    const next = updater(clone(current))
    this.setCollection(key, next)
    return next
  }

  private notifyCollection<K extends CollectionKey>(key: K) {
    const listeners = this.collectionListeners.get(key)
    if (!listeners?.size) return

    const snapshot = clone(this.getCollection(key))
    listeners.forEach((listener) => {
      listener(snapshot)
    })
  }

  on<K extends EventName>(event: K, listener: Listener<DatabaseEventMap[K]>) {
    const listeners = this.eventListeners.get(event) ?? new Set<(payload: unknown) => void>()
    listeners.add(listener as (payload: unknown) => void)
    this.eventListeners.set(event, listeners)
  }

  off<K extends EventName>(event: K, listener: Listener<DatabaseEventMap[K]>) {
    const listeners = this.eventListeners.get(event)
    if (!listeners) return

    listeners.delete(listener as (payload: unknown) => void)
    if (listeners.size === 0) {
      this.eventListeners.delete(event)
    }
  }

  private emit<K extends EventName>(event: K, payload: DatabaseEventMap[K]) {
    const listeners = this.eventListeners.get(event)
    if (!listeners?.size) return

    listeners.forEach((listener) => {
      ;(listener as Listener<DatabaseEventMap[K]>)(payload)
    })
  }

  subscribe<K extends CollectionKey>(key: K, listener: Listener<Collections[K]>): () => void {
    const listeners = this.collectionListeners.get(key) ?? new Set<(value: Collections[CollectionKey]) => void>()
    listeners.add(listener as (value: Collections[CollectionKey]) => void)
    this.collectionListeners.set(key, listeners)

    listener(clone(this.getCollection(key)))

    return () => {
      const current = this.collectionListeners.get(key)
      if (!current) return
      current.delete(listener as (value: Collections[CollectionKey]) => void)
      if (current.size === 0) {
        this.collectionListeners.delete(key)
      }
    }
  }

  async getStudents() {
    const students = await studentRepository.listStudents()
    return students.map((student) => mapStudentEntity(student))
  }

  private async ensureClassRecord(classValue?: string | null) {
    if (!classValue) return null

    try {
      const byId = await classRepository.findClassById(classValue)
      if (byId) return byId
    } catch {
      /* ignore lookup errors */
    }

    const byName = await classRepository.findClassByName(classValue)
    if (byName) return byName

    return classRepository.createClass({ name: classValue })
  }

  async createStudent(
    student: Partial<Student> &
      Pick<
        Student,
        "name" | "email" | "class" | "section" | "admissionNumber" | "parentName" | "parentEmail"
      >,
  ) {
    const classRecord = await this.ensureClassRecord(student.class)

    const created = await studentRepository.createStudent({
      name: student.name,
      email: student.email,
      classId: classRecord?.id,
      section: student.section,
      admissionNumber: student.admissionNumber,
      parentName: student.parentName,
      parentEmail: student.parentEmail,
      paymentStatus:
        student.paymentStatus === "paid"
          ? PrismaStudentPaymentStatus.PAID
          : student.paymentStatus === "overdue"
            ? PrismaStudentPaymentStatus.OVERDUE
            : PrismaStudentPaymentStatus.PENDING,
      status: student.status === "inactive" ? PrismaStudentStatus.INACTIVE : PrismaStudentStatus.ACTIVE,
      dateOfBirth: student.dateOfBirth,
      address: student.address,
      phone: student.phone,
      guardianPhone: student.guardianPhone,
      bloodGroup: student.bloodGroup,
      admissionDate: student.admissionDate,
      subjects: student.subjects,
      attendance: student.attendance,
      grades: student.grades,
      photoUrl: student.photoUrl,
    })

    const mapped = mapStudentEntity(created)
    this.emit("studentCreated", mapped)
    return mapped
  }

  async updateStudent(studentId: string, updates: Partial<Student>) {
    let classId: string | undefined | null
    if (updates.class !== undefined) {
      const classRecord = await this.ensureClassRecord(updates.class)
      classId = classRecord?.id ?? null
    }

    const updated = await studentRepository.updateStudent(studentId, {
      name: updates.name,
      email: updates.email,
      classId,
      section: updates.section,
      admissionNumber: updates.admissionNumber,
      parentName: updates.parentName,
      parentEmail: updates.parentEmail,
      paymentStatus:
        updates.paymentStatus === undefined
          ? undefined
          : updates.paymentStatus === "paid"
            ? PrismaStudentPaymentStatus.PAID
            : updates.paymentStatus === "overdue"
              ? PrismaStudentPaymentStatus.OVERDUE
              : PrismaStudentPaymentStatus.PENDING,
      status:
        updates.status === undefined
          ? undefined
          : updates.status === "inactive"
            ? PrismaStudentStatus.INACTIVE
            : PrismaStudentStatus.ACTIVE,
      dateOfBirth: updates.dateOfBirth,
      address: updates.address,
      phone: updates.phone,
      guardianPhone: updates.guardianPhone,
      bloodGroup: updates.bloodGroup,
      admissionDate: updates.admissionDate,
      subjects: updates.subjects,
      attendance: updates.attendance,
      grades: updates.grades,
      photoUrl: updates.photoUrl,
    })

    const mapped = mapStudentEntity(updated)
    this.emit("studentUpdated", mapped)
    return mapped
  }

  async deleteStudent(studentId: string) {
    const deleted = await studentRepository.deleteStudent(studentId)
    this.emit("studentDeleted", { id: studentId })
    return mapStudentEntity(deleted)
  }

  async getStudentsByClass(classId: string) {
    if (!classId || classId === "all") {
      return this.getStudents()
    }

    const classRecord = await this.ensureClassRecord(classId)
    if (!classRecord) return []

    const students = await studentRepository.findStudentsByClass(classRecord.id)
    return students.map((student) => mapStudentEntity(student))
  }

  async getClasses() {
    const classes = await classRepository.listClasses()
    return classes.map((klass) => mapClassEntity(klass))
  }

  async createClass(data: Omit<ClassRecord, "id"> & { id?: string }) {
    const created = await classRepository.createClass({
      name: data.name,
      level: data.level,
      section: null,
      capacity: data.capacity,
      status: data.status === "inactive" ? "INACTIVE" : "ACTIVE",
      subjects: data.subjects,
      teacherId: data.classTeacherId,
    })

    return mapClassEntity(created)
  }

  async updateClass(classId: string, updates: Partial<ClassRecord>) {
    const updated = await classRepository.updateClass(classId, {
      name: updates.name,
      level: updates.level,
      capacity: updates.capacity,
      status: updates.status === undefined ? undefined : updates.status === "inactive" ? "INACTIVE" : "ACTIVE",
      subjects: updates.subjects,
      teacherId: updates.classTeacherId,
    })

    return mapClassEntity(updated)
  }

  async getAssignments(filters: { teacherId?: string; studentId?: string; classId?: string } = {}) {
    const searchFilters: { classId?: string; teacherId?: string } = {}

    if (filters.classId) {
      const classRecord = await this.ensureClassRecord(filters.classId)
      if (!classRecord) return []
      searchFilters.classId = classRecord.id
    }

    if (filters.teacherId) {
      searchFilters.teacherId = filters.teacherId
    }

    if (filters.studentId) {
      const student = await studentRepository.findStudentById(filters.studentId)
      if (!student?.classId) {
        return []
      }
      searchFilters.classId = student.classId
    }

    const assignments = await assignmentRepository.listAssignments(searchFilters)
    return assignments.map((assignment) => mapAssignmentEntity(assignment))
  }

  async createAssignment(data: Omit<Assignment, "id" | "createdAt"> & { id?: string }) {
    const classRecord = await this.ensureClassRecord(data.classId)
    if (!classRecord) {
      throw new Error("Class not found for assignment")
    }

    const created = await assignmentRepository.createAssignment({
      title: data.title,
      description: data.description,
      subject: data.subject,
      classId: classRecord.id,
      teacherId: data.teacherId,
      dueDate: data.dueDate,
      status: data.status === "closed" ? "CLOSED" : "ACTIVE",
    })

    return mapAssignmentEntity(created)
  }

  async createAssignmentSubmission(data: Omit<AssignmentSubmission, "id" | "submittedAt"> & { id?: string }) {
    const created = await assignmentRepository.createSubmission({
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      files: data.files,
      status:
        data.status === "graded"
          ? SubmissionStatus.GRADED
          : data.status === "submitted"
            ? SubmissionStatus.SUBMITTED
            : SubmissionStatus.PENDING,
      submittedAt: new Date().toISOString(),
      grade: data.grade,
      feedback: data.feedback,
    })

    return mapSubmissionEntity(created)
  }

  async getBooks() {
    return clone(this.getCollection("books"))
  }

  async addBook(data: Omit<Book, "id"> & { id?: string }) {
    const book: Book = {
      id: data.id ?? randomUUID(),
      title: data.title,
      author: data.author,
      category: data.category,
      copies: data.copies,
      availableCopies: data.availableCopies ?? data.copies,
      status: data.status,
    }

    this.updateCollection("books", (current) => [...current, book])
    this.notifyCollection("books")
    return book
  }

  async getBorrowedBooks() {
    return clone(this.getCollection("borrowedBooks"))
  }

  async getBookRequests() {
    return clone(this.getCollection("bookRequests"))
  }

  async updateBookRequest(requestId: string, updates: Partial<BookRequest>) {
    let updated: BookRequest | null = null

    this.updateCollection("bookRequests", (current) =>
      current.map((request) => {
        if (request.id !== requestId) return request
        updated = { ...request, ...updates, updatedAt: new Date().toISOString() }
        return updated
      }),
    )

    if (!updated) {
      throw new Error(`Book request with id ${requestId} not found`)
    }

    this.notifyCollection("bookRequests")
    return updated
  }

  async returnBook(borrowId: string, updates: Partial<BorrowedBook> = {}) {
    let updated: BorrowedBook | undefined

    this.updateCollection("borrowedBooks", (current) =>
      current.map((record) => {
        if (record.id !== borrowId) return record
        updated = {
          ...record,
          ...updates,
          status: "returned",
          returnedAt: new Date().toISOString(),
        }
        return updated
      }),
    )

    if (!updated) {
      return null
    }

    const finalRecord: BorrowedBook = updated

    this.updateCollection("books", (books) =>
      books.map((book) => {
        if (book.id !== finalRecord.bookId) return book
        return {
          ...book,
          availableCopies: Math.min(book.copies, book.availableCopies + 1),
        }
      }),
    )

    this.notifyCollection("borrowedBooks")
    this.emit("libraryBookRenewed", { bookId: finalRecord.bookId, studentId: finalRecord.studentId })
    return finalRecord
  }

  async getPayments(): Promise<Payment[]> {
    const payments = await paymentRepository.listPayments()
    return payments.map((payment) => mapPaymentEntity(payment))
  }

  async getReceipts(): Promise<Receipt[]> {
    const receipts = await paymentRepository.listReceipts()
    return receipts.map((receipt) => mapReceiptEntity(receipt))
  }

  async getFeeStructure() {
    return clone(this.getCollection("feeStructure"))
  }

  async saveFeeStructure(data: Omit<FeeStructure, "id" | "updatedAt" | "total"> & { id?: string; total?: number }) {
    const fee: FeeStructure = {
      id: data.id ?? randomUUID(),
      class: data.class,
      tuition: data.tuition,
      development: data.development,
      exam: data.exam,
      sports: data.sports,
      library: data.library,
      total:
        data.total ?? data.tuition + data.development + data.exam + data.sports + data.library,
      updatedAt: new Date().toISOString(),
    }

    this.updateCollection("feeStructure", (current) => {
      const existingIndex = current.findIndex((item) => item.class === fee.class)
      if (existingIndex === -1) {
        return [...current, fee]
      }
      const next = [...current]
      next[existingIndex] = fee
      return next
    })

    this.notifyCollection("feeStructure")
    this.emit("financialDataUpdated", await this.getFinancialSummary("current"))
    return fee
  }

  async generateReceipt(payment: Payment) {
    const receipt = await paymentRepository.createReceipt({
      paymentId: payment.id,
      issuedTo: payment.studentId,
      amount: payment.amount,
      items: [
        { label: "Tuition", amount: Math.round(payment.amount * 0.7) },
        { label: "Development", amount: Math.round(payment.amount * 0.2) },
        { label: "Miscellaneous", amount: payment.amount - Math.round(payment.amount * 0.9) },
      ],
    })

    this.emit("paymentProcessed", payment)
    return mapReceiptEntity(receipt)
  }

  async generateFinancialReport(type: string, payments: Payment[]) {
    const paid = payments.filter((payment) => payment.status === "paid")
    const revenue = paid.reduce((sum, payment) => sum + payment.amount, 0)
    const expenses = Math.round(revenue * 0.35)
    const outstanding = payments
      .filter((payment) => payment.status !== "paid")
      .reduce((sum, payment) => sum + payment.amount, 0)

    const report: FinancialReport = {
      id: randomUUID(),
      type,
      generatedAt: new Date().toISOString(),
      totals: { revenue, expenses, outstanding },
    }

    this.updateCollection("financialReports", (current) => [...current, report])
    return report
  }

  async savePayment(data: Omit<Payment, "id" | "reference" | "date"> & { id?: string }) {
    const created = await paymentRepository.createPayment({
      studentId: data.studentId,
      amount: data.amount,
      status: data.status === "failed" ? "FAILED" : data.status === "pending" ? "PENDING" : "PAID",
      method: data.method,
      reference: data.id ?? `PAY-${Date.now()}`,
      term: data.term,
      description: data.description,
      paidAt: new Date().toISOString(),
    })

    const payment = mapPaymentEntity(created)
    this.emit("paymentProcessed", payment)
    this.emit("financialDataUpdated", await this.getFinancialSummary("current"))
    return payment
  }

  async getFeeCollectionData(period: string) {
    const payments = await this.getPayments()
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]

    return months.map((month, index) => {
      const monthPayments = payments.filter((payment) => new Date(payment.date).getMonth() === index)
      const collected = monthPayments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0)
      const expected = monthPayments.reduce((sum, p) => sum + p.amount, 0) || 300000
      const percentage = expected > 0 ? Math.round((collected / expected) * 1000) / 10 : 0

      return { month: month.slice(0, 3), collected, expected, percentage }
    })
  }

  async getClassWiseCollection(period: string, classFilter: string) {
    const students = await this.getStudents()
    const payments = await this.getPayments()

    const classes = new Map<string, { collected: number; expected: number; students: number }>()
    students.forEach((student) => {
      if (classFilter !== "all" && student.class.toLowerCase() !== classFilter.toLowerCase()) {
        return
      }
      if (!classes.has(student.class)) {
        classes.set(student.class, { collected: 0, expected: 0, students: 0 })
      }
      const entry = classes.get(student.class)!
      entry.students += 1
      const classPayments = payments.filter((payment) => payment.studentId === student.id)
      entry.collected += classPayments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0)
      entry.expected += classPayments.reduce((sum, payment) => sum + payment.amount, 0) || 250000
    })

    return Array.from(classes.entries()).map(([name, data]) => ({
      class: name,
      collected: data.collected,
      expected: data.expected,
      students: data.students,
      percentage: data.expected > 0 ? Math.round((data.collected / data.expected) * 1000) / 10 : 0,
    }))
  }

  async getExpenseData(_period: string) {
    return [
      { category: "Salaries", amount: 450000, budget: 500000 },
      { category: "Facilities", amount: 160000, budget: 180000 },
      { category: "Utilities", amount: 90000, budget: 95000 },
      { category: "Maintenance", amount: 60000, budget: 75000 },
    ]
  }

  async getFeeDefaulters(): Promise<FeeDefaulter[]> {
    const students = await this.getStudents()
    const payments = await this.getPayments()

    return students
      .filter((student) => student.paymentStatus !== "paid")
      .map((student) => {
        const studentPayments = payments.filter((payment) => payment.studentId === student.id)
        const paid = studentPayments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0)
        const expected = studentPayments.reduce((sum, payment) => sum + payment.amount, 0) || 250000

        return {
          id: student.id,
          name: student.name,
          class: student.class,
          amountOwed: Math.max(expected - paid, 0),
          lastPaymentDate: studentPayments.find((payment) => payment.status === "paid")?.date,
        }
      })
      .filter((entry) => entry.amountOwed > 0)
  }

  async getFinancialSummary(period: string): Promise<FinancialSummary> {
    const payments = await this.getPayments()
    const collected = payments.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0)
    const expected = payments.reduce((sum, payment) => sum + payment.amount, 0)
    const outstanding = expected - collected
    const expenses = Math.round(collected * 0.35)

    return {
      period,
      totalCollected: collected,
      totalExpected: expected,
      outstanding,
      expenses,
    }
  }

  async saveFinancialReport(report: Omit<FinancialReport, "id" | "generatedAt">) {
    const saved: FinancialReport = {
      id: randomUUID(),
      type: report.type,
      generatedAt: new Date().toISOString(),
      totals: report.totals,
      notes: report.notes,
    }

    this.updateCollection("financialReports", (current) => [...current, saved])
    return saved
  }

  async sendPaymentReminder(studentId: string) {
    // In a real application this would trigger an email/SMS.
    console.info(`Payment reminder sent to student ${studentId}`)
  }

  async contactParent(studentId: string) {
    console.info(`Parent contacted for student ${studentId}`)
  }

  async getAcademicAnalytics(term: string, classId: string) {
    const reports = this.getCollection("analyticsReports")
    const matching =
      reports.find((report) => (term === "all" || report.term === term) && (classId === "all" || report.classId === classId)) ??
      reports[0]

    return clone(matching)
  }

  async saveAnalyticsReport(report: Omit<AnalyticsReport, "id" | "createdAt">) {
    const saved: AnalyticsReport = {
      ...report,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }

    this.updateCollection("analyticsReports", (current) => [...current, saved])
    this.emit("analyticsReportSaved", saved)
    this.emit("academicDataUpdated", { classId: report.classId, term: report.term })
    return saved
  }

  async getAllAnalyticsReports() {
    return clone(this.getCollection("analyticsReports"))
  }

  async getStudentAcademicData(studentId: string): Promise<AcademicSubjectPerformance[]> {
    const grades = this.getCollection("grades").filter((grade) => grade.studentId === studentId)
    return grades.map((grade) => ({
      subject: grade.subject,
      totalPercentage: Math.round((grade.total / 100) * 1000) / 10,
      totalScore: grade.total,
      grade: grade.grade,
    }))
  }

  async getStudentAttendance(studentId: string): Promise<AttendanceSummary> {
    const student = this.getCollection("students").find((entry) => entry.id === studentId)
    if (!student) {
      return { presentDays: 0, totalDays: 0, percentage: 0 }
    }

    const { present, total } = student.attendance
    const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 0
    return { presentDays: present, totalDays: total, percentage }
  }

  async savePromotionAnalysis(analysis: Omit<PromotionAnalysis, "id" | "createdAt">) {
    const saved: PromotionAnalysis = {
      ...analysis,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }

    this.updateCollection("promotionAnalyses", (current) => [...current, saved])
    this.emit("academicDataUpdated", { classId: analysis.classId })
    return saved
  }

  async promoteStudent(studentId: string, promotionData: { toClass: string; session: string; promotedAt: string }) {
    await this.updateStudent(studentId, { class: promotionData.toClass })
    const promotion = await this.savePromotionAnalysis({
      classId: promotionData.toClass,
      summary: `Student ${studentId} promoted to ${promotionData.toClass}`,
      recommendations: [
        { studentId, status: "eligible" },
      ],
    })

    this.emit("studentPromoted", { studentId, promotion })
    return true
  }

  async saveBatchPromotion(batch: Omit<BatchPromotion, "id" | "createdAt">) {
    const saved: BatchPromotion = {
      ...batch,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }

    this.updateCollection("batchPromotions", (current) => [...current, saved])
    this.emit("batchPromotionCompleted", saved)
    return saved
  }

  async getStudentGrades(studentId: string) {
    return clone(this.getCollection("grades").filter((grade) => grade.studentId === studentId))
  }

  async getClassGrades(classId: string) {
    return clone(this.getCollection("grades").filter((grade) => grade.classId === classId))
  }

  async getAllGrades() {
    return clone(this.getCollection("grades"))
  }

  private deriveGrade(total: number) {
    if (total >= 75) return "A"
    if (total >= 60) return "B"
    if (total >= 50) return "C"
    if (total >= 40) return "D"
    if (total >= 30) return "E"
    return "F"
  }

  async saveGrade(grade: {
    id?: string
    studentId: string
    subject: string
    classId?: string
    term?: string
    ca1?: number
    ca2?: number
    exam?: number
    total?: number
    grade?: string
    remarks?: string
    teacherId?: string
  }) {
    const ca1 = grade.ca1 ?? 0
    const ca2 = grade.ca2 ?? 0
    const exam = grade.exam ?? 0
    const total = grade.total ?? ca1 + ca2 + exam

    const newGrade: GradeRecord = {
      id: grade.id ?? randomUUID(),
      studentId: grade.studentId,
      classId: grade.classId ?? "general",
      subject: grade.subject,
      term: grade.term ?? "current",
      ca1,
      ca2,
      exam,
      total,
      grade: grade.grade ?? this.deriveGrade(total),
      remarks: grade.remarks,
      teacherId: grade.teacherId,
    }

    this.updateCollection("grades", (current) => [...current, newGrade])
    this.emit("marksUpdated", { studentId: grade.studentId })
    return newGrade
  }

  async updateGrade(gradeId: string, updates: Partial<GradeRecord>) {
    let updated: GradeRecord | undefined
    this.updateCollection("grades", (current) =>
      current.map((grade) => {
        if (grade.id !== gradeId) return grade
        const merged: GradeRecord = { ...grade, ...updates }
        const ca1 = merged.ca1 ?? 0
        const ca2 = merged.ca2 ?? 0
        const exam = merged.exam ?? 0
        merged.total = updates.total ?? ca1 + ca2 + exam
        merged.grade = updates.grade ?? this.deriveGrade(merged.total)
        updated = merged
        return updated
      }),
    )

    if (!updated) {
      throw new Error(`Grade with id ${gradeId} not found`)
    }

    const finalGrade: GradeRecord = updated

    this.emit("marksUpdated", { studentId: finalGrade.studentId })
    return finalGrade
  }

  async getUser(userId: string) {
    const user = await userRepository.findUserById(userId)
    return user ? mapUserEntity(user) : null
  }

  async getUsersByRole(role: string) {
    const normalisedRole = parseUserRole(role)
    const users = await userRepository.listUsers(normalisedRole)
    return users.map(mapUserEntity)
  }

  async getAllUsers() {
    const users = await userRepository.listUsers()
    return users.map(mapUserEntity)
  }

  async createUser(user: Omit<UserRecord, "id" | "createdAt"> & { id?: string }) {
    const created = await userRepository.createUser({
      name: user.name,
      email: user.email,
      role: parseUserRole(user.role),
      status: user.status === "inactive" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
      passwordHash: user.passwordHash,
      metadata: {
        studentIds: user.studentIds,
        subjects: user.subjects,
      },
    })

    await auditLogRepository.recordAuditLog({
      action: "user.created",
      entity: "user",
      entityId: created.id,
      details: { email: created.email, role: created.role },
    })

    this.emit("academicDataUpdated", {})
    return mapUserEntity(created)
  }

  async updateUser(userId: string, updates: Partial<UserRecord>) {
    const updated = await userRepository.updateUser(userId, {
      name: updates.name,
      email: updates.email,
      role: updates.role ? parseUserRole(updates.role) : undefined,
      status: updates.status
        ? updates.status === "inactive"
          ? UserStatus.INACTIVE
          : UserStatus.ACTIVE
        : undefined,
      passwordHash: updates.passwordHash,
      metadata:
        updates.studentIds || updates.subjects
          ? {
              studentIds: updates.studentIds,
              subjects: updates.subjects,
            }
          : undefined,
    })

    await auditLogRepository.recordAuditLog({
      action: "user.updated",
      entity: "user",
      entityId: userId,
      details: updates,
    })

    this.emit("academicDataUpdated", {})
    return mapUserEntity(updated)
  }
}

export const dbManager = DatabaseManager.getInstance()
export default dbManager
