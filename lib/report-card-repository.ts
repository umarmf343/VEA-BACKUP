import { randomUUID } from "crypto"

import { readPersistentState, resetPersistentState, writePersistentState } from "./persistent-state"
import type { ApprovalHistory, ReportCardRecord, ReportCardStatus, SubjectScore } from "./report-card-types"

const STORE_KEY = "vea-report-cards"

const VALID_STATUSES: ReportCardStatus[] = ["draft", "submitted", "approved", "revoked", "published"]

const DEFAULT_AFFECTIVE: ReportCardRecord["affectiveDomain"] = {
  neatness: "Good",
  honesty: "Good",
  punctuality: "Good",
}

const DEFAULT_PSYCHOMOTOR: ReportCardRecord["psychomotorDomain"] = {
  sport: "Good",
  handwriting: "Good",
}

function deepClone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidStatus(value: unknown): value is ReportCardStatus {
  return typeof value === "string" && VALID_STATUSES.includes(value as ReportCardStatus)
}

function ensureIsoDate(value?: string): string | undefined {
  if (!value) return undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString()
  }
  return parsed.toISOString()
}

function gradeFromTotal(total: number): string {
  if (total >= 75) return "A"
  if (total >= 60) return "B"
  if (total >= 50) return "C"
  if (total >= 40) return "D"
  if (total >= 30) return "E"
  return "F"
}

type SubjectSeed = Partial<SubjectScore> & { name?: unknown; teacherId?: unknown; teacherName?: unknown }

function buildSubject(subject: SubjectSeed): SubjectScore {
  const ca1 = Number(subject.ca1 ?? 0)
  const ca2 = Number(subject.ca2 ?? 0)
  const assignment = Number(subject.assignment ?? 0)
  const exam = Number(subject.exam ?? 0)
  const caTotal = Number(ca1 + ca2 + assignment)
  const total = Number(caTotal + exam)

  const remarks = typeof subject.remarks === "string" ? subject.remarks : ""
  const teacherId = typeof subject.teacherId === "string" && subject.teacherId.trim().length > 0 ? subject.teacherId : "teacher-unassigned"
  const teacherName = typeof subject.teacherName === "string" && subject.teacherName.trim().length > 0 ? subject.teacherName : undefined

  return {
    name: typeof subject.name === "string" && subject.name.trim().length > 0 ? subject.name : "Subject",
    ca1,
    ca2,
    assignment,
    exam,
    caTotal,
    total,
    grade: typeof subject.grade === "string" && subject.grade.trim().length > 0 ? subject.grade : gradeFromTotal(total),
    remarks,
    teacherId,
    teacherName,
    updatedAt: ensureIsoDate(subject.updatedAt) || new Date().toISOString(),
  }
}

function computeAggregates(subjects: SubjectScore[]) {
  const totalObtained = subjects.reduce((sum, subject) => sum + subject.total, 0)
  const totalObtainable = subjects.length * 100
  const average = totalObtainable > 0 ? Number(((totalObtained / totalObtainable) * 100).toFixed(1)) : 0
  return { totalObtained, totalObtainable, average }
}

type ReportCardSeed = Omit<Partial<ReportCardRecord>, "subjects" | "approvals"> & {
  subjects?: SubjectSeed[]
  approvals?: Array<Partial<ApprovalHistory>>
}

function sanitizeRecord(record: ReportCardSeed): ReportCardRecord {
  const subjects = Array.isArray(record.subjects) ? record.subjects.map((subject) => buildSubject(subject)) : []
  const aggregates = computeAggregates(subjects)

  const studentId = typeof record.studentId === "string" && record.studentId.trim().length > 0 ? record.studentId : `student-${randomUUID()}`
  const admissionNumberBase = typeof record.admissionNumber === "string" && record.admissionNumber.trim().length > 0
    ? record.admissionNumber
    : `VEA/${studentId}/${new Date().getFullYear()}`

  const submittedAt = ensureIsoDate(record.submittedAt) || new Date().toISOString()
  const updatedAt = ensureIsoDate(record.updatedAt) || submittedAt
  const publishedAt = ensureIsoDate(record.publishedAt)

  const metadata: ReportCardRecord["metadata"] = isPlainObject(record.metadata)
    ? { ...(record.metadata as ReportCardRecord["metadata"]) }
    : {}

  if (typeof metadata?.numberInClass === "string") {
    const parsed = Number(metadata.numberInClass)
    metadata.numberInClass = Number.isFinite(parsed) ? parsed : undefined
  }

  return {
    id: typeof record.id === "string" && record.id.trim().length > 0 ? record.id : randomUUID(),
    studentId,
    studentName:
      typeof record.studentName === "string" && record.studentName.trim().length > 0
        ? record.studentName
        : "Unknown Student",
    admissionNumber: admissionNumberBase,
    className:
      typeof record.className === "string" && record.className.trim().length > 0
        ? record.className
        : "Unassigned",
    term: typeof record.term === "string" && record.term.trim().length > 0 ? record.term : "First Term",
    session:
      typeof record.session === "string" && record.session.trim().length > 0 ? record.session : "2024/2025",
    status: isValidStatus(record.status) ? record.status : "submitted",
    teacherId:
      typeof record.teacherId === "string" && record.teacherId.trim().length > 0
        ? record.teacherId
        : "teacher-unassigned",
    teacherName:
      typeof record.teacherName === "string" && record.teacherName.trim().length > 0 ? record.teacherName : undefined,
    subjects,
    affectiveDomain: {
      ...DEFAULT_AFFECTIVE,
      ...(isPlainObject(record.affectiveDomain) ? (record.affectiveDomain as ReportCardRecord["affectiveDomain"]) : {}),
    },
    psychomotorDomain: {
      ...DEFAULT_PSYCHOMOTOR,
      ...(isPlainObject(record.psychomotorDomain)
        ? (record.psychomotorDomain as ReportCardRecord["psychomotorDomain"])
        : {}),
    },
    classTeacherRemarks:
      typeof record.classTeacherRemarks === "string" && record.classTeacherRemarks.trim().length > 0
        ? record.classTeacherRemarks
        : "Keep up the excellent work and continue to strive for academic excellence.",
    totalObtained: aggregates.totalObtained,
    totalObtainable: aggregates.totalObtainable,
    average: aggregates.average,
    position: typeof record.position === "string" && record.position.trim().length > 0 ? record.position : "--",
    submittedAt,
    updatedAt,
    publishedAt,
    adminFeedback:
      typeof record.adminFeedback === "string" && record.adminFeedback.trim().length > 0
        ? record.adminFeedback
        : undefined,
    approvals: Array.isArray(record.approvals)
      ? record.approvals
          .reduce<ApprovalHistory[]>((acc, approval) => {
            if (!approval) {
              return acc
            }

            const status: ApprovalHistory["status"] = approval.status === "revoked" ? "revoked" : "approved"
            const actorId =
              typeof approval.actorId === "string" && approval.actorId.trim().length > 0
                ? approval.actorId
                : "system"
            const actorRole =
              typeof approval.actorRole === "string" && approval.actorRole.trim().length > 0
                ? approval.actorRole
                : "Admin"
            const message =
              typeof approval.message === "string" && approval.message.trim().length > 0
                ? approval.message
                : undefined
            const timestamp = ensureIsoDate(approval.timestamp) || new Date().toISOString()

            acc.push({ status, actorId, actorRole, message, timestamp })
            return acc
          }, [])
          .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      : [],
    metadata,
  }
}

const SEED_RECORDS: ReportCardRecord[] = [
  sanitizeRecord({
    id: "rc-jss1a-john-doe-2024-first",
    studentId: "student-1",
    studentName: "John Doe",
    admissionNumber: "VEA/2024/001",
    className: "JSS 1A",
    term: "First Term",
    session: "2024/2025",
    status: "published",
    teacherId: "teacher-1",
    teacherName: "Mrs. Grace Okafor",
    subjects: [
      {
        name: "Mathematics",
        ca1: 18,
        ca2: 16,
        assignment: 9,
        exam: 52,
        remarks: "Excellent performance with strong analytical skills.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-10T09:00:00.000Z",
      },
      {
        name: "English Language",
        ca1: 16,
        ca2: 14,
        assignment: 8,
        exam: 48,
        remarks: "Great comprehension skills and confident presentations.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-10T09:05:00.000Z",
      },
      {
        name: "Basic Science",
        ca1: 15,
        ca2: 13,
        assignment: 7,
        exam: 45,
        remarks: "Participates actively in laboratory sessions.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-10T09:10:00.000Z",
      },
      {
        name: "Social Studies",
        ca1: 17,
        ca2: 15,
        assignment: 8,
        exam: 47,
        remarks: "Shows excellent awareness of civic responsibilities.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-10T09:15:00.000Z",
      },
      {
        name: "French",
        ca1: 14,
        ca2: 12,
        assignment: 6,
        exam: 40,
        remarks: "Making steady progress with pronunciation and vocabulary.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-10T09:20:00.000Z",
      },
    ],
    affectiveDomain: {
      neatness: "Excellent",
      honesty: "Excellent",
      punctuality: "Very Good",
    },
    psychomotorDomain: {
      sport: "Very Good",
      handwriting: "Excellent",
    },
    classTeacherRemarks:
      "John continues to set the pace for the class. His leadership and academic performance remain exceptional.",
    position: "1st",
    submittedAt: "2024-12-10T10:00:00.000Z",
    updatedAt: "2024-12-20T08:30:00.000Z",
    publishedAt: "2024-12-20T09:00:00.000Z",
    adminFeedback: "Released to parents via the portal.",
    approvals: [
      {
        status: "approved",
        actorId: "admin-1",
        actorRole: "Admin",
        message: "Reviewed and cleared for publication.",
        timestamp: "2024-12-18T12:00:00.000Z",
      },
      {
        status: "approved",
        actorId: "super-admin-1",
        actorRole: "Super Admin",
        message: "Published for parent access.",
        timestamp: "2024-12-20T09:00:00.000Z",
      },
    ],
    metadata: {
      numberInClass: 25,
      resumptionDate: "2025-01-15",
      vacationDate: "2024-12-14",
    },
  }),
  sanitizeRecord({
    id: "rc-jss1a-mary-james-2024-first",
    studentId: "student-2",
    studentName: "Mary James",
    admissionNumber: "VEA/2024/002",
    className: "JSS 1A",
    term: "First Term",
    session: "2024/2025",
    status: "submitted",
    teacherId: "teacher-1",
    teacherName: "Mrs. Grace Okafor",
    subjects: [
      {
        name: "Mathematics",
        ca1: 16,
        ca2: 15,
        assignment: 8,
        exam: 46,
        remarks: "Shows good reasoning ability and participates actively.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-11T09:00:00.000Z",
      },
      {
        name: "English Language",
        ca1: 14,
        ca2: 13,
        assignment: 7,
        exam: 44,
        remarks: "Reads widely and contributes meaningfully to discussions.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-11T09:05:00.000Z",
      },
      {
        name: "Basic Science",
        ca1: 13,
        ca2: 12,
        assignment: 6,
        exam: 41,
        remarks: "Understands concepts and asks thoughtful questions.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-11T09:10:00.000Z",
      },
      {
        name: "Social Studies",
        ca1: 15,
        ca2: 14,
        assignment: 7,
        exam: 43,
        remarks: "Demonstrates good understanding of history topics.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-11T09:15:00.000Z",
      },
      {
        name: "French",
        ca1: 13,
        ca2: 11,
        assignment: 6,
        exam: 38,
        remarks: "Developing confidence in speaking exercises.",
        teacherId: "teacher-1",
        teacherName: "Mrs. Grace Okafor",
        updatedAt: "2024-12-11T09:20:00.000Z",
      },
    ],
    affectiveDomain: {
      neatness: "Very Good",
      honesty: "Excellent",
      punctuality: "Very Good",
    },
    psychomotorDomain: {
      sport: "Good",
      handwriting: "Very Good",
    },
    classTeacherRemarks:
      "Mary is diligent and attentive. Encourage her to revise consistently to reach the top tier.",
    position: "2nd",
    submittedAt: "2024-12-11T10:00:00.000Z",
    updatedAt: "2024-12-11T10:00:00.000Z",
    approvals: [],
    metadata: {
      numberInClass: 25,
      resumptionDate: "2025-01-15",
    },
  }),
  sanitizeRecord({
    id: "rc-ss1-science-chidi-okonkwo-2024-first",
    studentId: "student-3",
    studentName: "Chidi Okonkwo",
    admissionNumber: "VEA/2024/145",
    className: "SS1 Science",
    term: "First Term",
    session: "2024/2025",
    status: "approved",
    teacherId: "teacher-physics-1",
    teacherName: "Mr. David Onu",
    subjects: [
      {
        name: "Mathematics",
        ca1: 17,
        ca2: 16,
        assignment: 9,
        exam: 46,
        remarks: "Handles additional exercises with confidence.",
        teacherId: "teacher-physics-1",
        teacherName: "Mr. David Onu",
        updatedAt: "2024-12-09T08:45:00.000Z",
      },
      {
        name: "English Language",
        ca1: 15,
        ca2: 14,
        assignment: 8,
        exam: 46,
        remarks: "Articulate in debates and group presentations.",
        teacherId: "teacher-physics-1",
        teacherName: "Mr. David Onu",
        updatedAt: "2024-12-09T08:50:00.000Z",
      },
      {
        name: "Physics",
        ca1: 18,
        ca2: 19,
        assignment: 9,
        exam: 48,
        remarks: "Outstanding grasp of theoretical and practical concepts.",
        teacherId: "teacher-physics-1",
        teacherName: "Mr. David Onu",
        updatedAt: "2024-12-09T08:55:00.000Z",
      },
      {
        name: "Chemistry",
        ca1: 16,
        ca2: 15,
        assignment: 8,
        exam: 47,
        remarks: "Very good with titration and organic chemistry topics.",
        teacherId: "teacher-physics-1",
        teacherName: "Mr. David Onu",
        updatedAt: "2024-12-09T09:00:00.000Z",
      },
      {
        name: "Biology",
        ca1: 17,
        ca2: 17,
        assignment: 8,
        exam: 46,
        remarks: "Detailed in diagrams and labelling.",
        teacherId: "teacher-physics-1",
        teacherName: "Mr. David Onu",
        updatedAt: "2024-12-09T09:05:00.000Z",
      },
      {
        name: "Further Mathematics",
        ca1: 18,
        ca2: 18,
        assignment: 9,
        exam: 50,
        remarks: "Thrives in advanced problem solving tasks.",
        teacherId: "teacher-physics-1",
        teacherName: "Mr. David Onu",
        updatedAt: "2024-12-09T09:10:00.000Z",
      },
    ],
    affectiveDomain: {
      neatness: "Excellent",
      honesty: "Very Good",
      punctuality: "Excellent",
    },
    psychomotorDomain: {
      sport: "Very Good",
      handwriting: "Good",
    },
    classTeacherRemarks:
      "Chidi has maintained a strong academic standing. Encourage continued collaboration with peers.",
    position: "1st",
    submittedAt: "2024-12-09T09:30:00.000Z",
    updatedAt: "2024-12-17T14:00:00.000Z",
    approvals: [
      {
        status: "approved",
        actorId: "admin-2",
        actorRole: "Admin",
        message: "Validated and ready for publication when term closes.",
        timestamp: "2024-12-17T14:00:00.000Z",
      },
    ],
    metadata: {
      numberInClass: 32,
      resumptionDate: "2025-01-10",
      vacationDate: "2024-12-13",
    },
  }),
]

let cachedRecords: ReportCardRecord[] | null = null

function loadRecords(): ReportCardRecord[] {
  if (!cachedRecords) {
    const stored = readPersistentState<ReportCardRecord[]>(STORE_KEY, () => deepClone(SEED_RECORDS))
    cachedRecords = stored.map((record) => sanitizeRecord(record))
    // Persist normalized records to disk to guarantee integrity across restarts
    writePersistentState(STORE_KEY, cachedRecords)
  }
  return cachedRecords
}

export async function readReportCards(): Promise<ReportCardRecord[]> {
  const records = loadRecords()
  return deepClone(records)
}

export async function writeReportCards(records: ReportCardRecord[]): Promise<void> {
  cachedRecords = records.map((record) => sanitizeRecord(record))
  writePersistentState(STORE_KEY, cachedRecords)
}

export async function resetReportCardStore() {
  cachedRecords = null
  resetPersistentState(STORE_KEY)
}

