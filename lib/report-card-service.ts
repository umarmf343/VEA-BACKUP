import { randomUUID } from "crypto"
import { readReportCards, writeReportCards } from "./report-card-repository"
import type {
  ApprovalHistory,
  ReportCardRecord,
  ReportCardResponse,
  ReportCardStatus,
  SubjectScore,
} from "./report-card-types"

export interface SubjectAssessmentInput {
  studentId: string
  studentName: string
  admissionNumber?: string
  className: string
  subject: string
  ca1: number
  ca2: number
  assignment: number
  exam: number
  remarks?: string
  term: string
  session: string
  teacherId: string
  teacherName?: string
  status?: ReportCardStatus
}

export interface CompleteReportCardInput {
  studentId: string
  studentName: string
  admissionNumber?: string
  className: string
  term: string
  session: string
  teacherId: string
  teacherName?: string
  subjects: Array<{
    name: string
    ca1: number
    ca2: number
    assignment: number
    exam: number
    remarks?: string
  }>
  affectiveDomain?: Partial<ReportCardRecord["affectiveDomain"]>
  psychomotorDomain?: Partial<ReportCardRecord["psychomotorDomain"]>
  classTeacherRemarks?: string
  status?: ReportCardStatus
  metadata?: ReportCardRecord["metadata"]
}

export interface ReportCardFilters {
  status?: ReportCardStatus
  className?: string
  term?: string
  session?: string
}

export interface StatusUpdateInput {
  studentId: string
  term: string
  session: string
  status: ReportCardStatus
  message?: string
  actorId?: string
  actorRole?: string
}

export interface AdminOverrideInput {
  studentId: string
  term: string
  session: string
  overrides: {
    classTeacherRemarks?: string
    metadata?: ReportCardRecord["metadata"]
    subjects?: Record<
      string,
      Partial<Pick<SubjectScore, "ca1" | "ca2" | "assignment" | "exam" | "remarks">>
    >
  }
  adminId: string
  reason: string
}

const DEFAULT_AFFECTIVE: ReportCardRecord["affectiveDomain"] = {
  neatness: "Good",
  honesty: "Good",
  punctuality: "Good",
}

const DEFAULT_PSYCHOMOTOR: ReportCardRecord["psychomotorDomain"] = {
  sport: "Good",
  handwriting: "Good",
}

function formatOrdinal(position: number): string {
  const suffixes = ["th", "st", "nd", "rd"]
  const value = position % 100
  return `${position}${suffixes[(value - 20) % 10] || suffixes[value] || suffixes[0]}`
}

function gradeFromTotal(total: number): string {
  if (total >= 75) return "A"
  if (total >= 60) return "B"
  if (total >= 50) return "C"
  if (total >= 40) return "D"
  if (total >= 30) return "E"
  return "F"
}

function buildSubjectScore(input: {
  name: string
  ca1: number
  ca2: number
  assignment: number
  exam: number
  remarks?: string
  teacherId: string
  teacherName?: string
}): SubjectScore {
  const caTotal = Number((input.ca1 || 0) + (input.ca2 || 0) + (input.assignment || 0))
  const total = Number(caTotal + (input.exam || 0))
  return {
    name: input.name,
    ca1: input.ca1,
    ca2: input.ca2,
    assignment: input.assignment,
    exam: input.exam,
    caTotal,
    total,
    grade: gradeFromTotal(total),
    remarks: input.remarks || "",
    teacherId: input.teacherId,
    teacherName: input.teacherName,
    updatedAt: new Date().toISOString(),
  }
}

function computeAggregates(subjects: SubjectScore[]) {
  const totalObtained = subjects.reduce((sum, subject) => sum + subject.total, 0)
  const totalObtainable = subjects.length * 100
  const average = totalObtainable > 0 ? Number(((totalObtained / totalObtainable) * 100).toFixed(1)) : 0
  return { totalObtained, totalObtainable, average }
}

function toResponse(record: ReportCardRecord): ReportCardResponse {
  return {
    id: record.id,
    student: {
      id: record.studentId,
      name: record.studentName,
      admissionNumber: record.admissionNumber,
      class: record.className,
      term: record.term,
      session: record.session,
      status: record.status,
      numberInClass: record.metadata?.numberInClass,
    },
    subjects: record.subjects,
    affectiveDomain: record.affectiveDomain,
    psychomotorDomain: record.psychomotorDomain,
    classTeacherRemarks: record.classTeacherRemarks,
    totalObtained: record.totalObtained,
    totalObtainable: record.totalObtainable,
    average: record.average,
    position: record.position,
    status: record.status,
    teacher: {
      id: record.teacherId,
      name: record.teacherName,
    },
    submittedAt: record.submittedAt,
    updatedAt: record.updatedAt,
    publishedAt: record.publishedAt,
    adminFeedback: record.adminFeedback,
    approvals: record.approvals,
    metadata: record.metadata,
  }
}

function ensureAdmissionNumber(studentId: string, admissionNumber?: string) {
  if (admissionNumber && admissionNumber.trim().length > 0) {
    return admissionNumber
  }
  return `VEA/${studentId}/${new Date().getFullYear()}`
}

function updateClassPositions(records: ReportCardRecord[], className: string, term: string, session: string) {
  const classRecords = records
    .filter((record) => record.className === className && record.term === term && record.session === session)
    .sort((a, b) => b.average - a.average)

  classRecords.forEach((record, index) => {
    record.position = formatOrdinal(index + 1)
    record.metadata = {
      ...record.metadata,
      numberInClass: classRecords.length,
    }
  })
}

function resetApprovalState(record: ReportCardRecord) {
  record.adminFeedback = undefined
  record.approvals = []
}

export async function submitSubjectAssessment(input: SubjectAssessmentInput): Promise<ReportCardResponse> {
  const records = await readReportCards()
  const key = (record: ReportCardRecord) =>
    record.studentId === input.studentId && record.term === input.term && record.session === input.session

  let record = records.find(key)
  const now = new Date().toISOString()

  if (!record) {
    record = {
      id: randomUUID(),
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNumber: ensureAdmissionNumber(input.studentId, input.admissionNumber),
      className: input.className,
      term: input.term,
      session: input.session,
      status: input.status || "submitted",
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      subjects: [],
      affectiveDomain: DEFAULT_AFFECTIVE,
      psychomotorDomain: DEFAULT_PSYCHOMOTOR,
      classTeacherRemarks: "Keep up the excellent work and continue to strive for academic excellence.",
      totalObtained: 0,
      totalObtainable: 0,
      average: 0,
      position: "--",
      submittedAt: now,
      updatedAt: now,
      approvals: [],
      metadata: {},
    }
    records.push(record)
  }

  const newSubject = buildSubjectScore({
    name: input.subject,
    ca1: input.ca1,
    ca2: input.ca2,
    assignment: input.assignment,
    exam: input.exam,
    remarks: input.remarks,
    teacherId: input.teacherId,
    teacherName: input.teacherName,
  })

  const existingIndex = record.subjects.findIndex((subject) => subject.name === input.subject)
  if (existingIndex >= 0) {
    record.subjects[existingIndex] = newSubject
  } else {
    record.subjects.push(newSubject)
  }

  const aggregates = computeAggregates(record.subjects)
  record.totalObtained = aggregates.totalObtained
  record.totalObtainable = aggregates.totalObtainable
  record.average = aggregates.average
  record.updatedAt = now
  record.teacherId = input.teacherId
  record.teacherName = input.teacherName
  record.studentName = input.studentName
  record.className = input.className
  record.admissionNumber = ensureAdmissionNumber(input.studentId, input.admissionNumber)

  if (record.status === "approved" || record.status === "published") {
    record.status = "submitted"
    resetApprovalState(record)
  } else {
    record.status = input.status || record.status || "submitted"
  }

  updateClassPositions(records, record.className, record.term, record.session)
  await writeReportCards(records)
  return toResponse(record)
}

export async function saveCompleteReportCard(input: CompleteReportCardInput): Promise<ReportCardResponse> {
  const records = await readReportCards()
  const now = new Date().toISOString()
  let record = records.find(
    (item) => item.studentId === input.studentId && item.term === input.term && item.session === input.session,
  )

  if (!record) {
    record = {
      id: randomUUID(),
      studentId: input.studentId,
      studentName: input.studentName,
      admissionNumber: ensureAdmissionNumber(input.studentId, input.admissionNumber),
      className: input.className,
      term: input.term,
      session: input.session,
      status: input.status || "submitted",
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      subjects: [],
      affectiveDomain: { ...DEFAULT_AFFECTIVE },
      psychomotorDomain: { ...DEFAULT_PSYCHOMOTOR },
      classTeacherRemarks:
        input.classTeacherRemarks || "Keep up the excellent work and continue to strive for academic excellence.",
      totalObtained: 0,
      totalObtainable: 0,
      average: 0,
      position: "--",
      submittedAt: now,
      updatedAt: now,
      approvals: [],
      metadata: input.metadata || {},
    }
    records.push(record)
  }

  record.subjects = input.subjects.map((subject) =>
    buildSubjectScore({
      name: subject.name,
      ca1: subject.ca1,
      ca2: subject.ca2,
      assignment: subject.assignment,
      exam: subject.exam,
      remarks: subject.remarks,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
    }),
  )

  record.affectiveDomain = { ...DEFAULT_AFFECTIVE, ...(input.affectiveDomain || {}) }
  record.psychomotorDomain = { ...DEFAULT_PSYCHOMOTOR, ...(input.psychomotorDomain || {}) }
  record.classTeacherRemarks =
    input.classTeacherRemarks ||
    record.classTeacherRemarks ||
    "Keep up the excellent work and continue to strive for academic excellence."
  record.metadata = { ...record.metadata, ...(input.metadata || {}) }
  record.teacherId = input.teacherId
  record.teacherName = input.teacherName
  record.studentName = input.studentName
  record.className = input.className
  record.admissionNumber = ensureAdmissionNumber(input.studentId, input.admissionNumber)

  const aggregates = computeAggregates(record.subjects)
  record.totalObtained = aggregates.totalObtained
  record.totalObtainable = aggregates.totalObtainable
  record.average = aggregates.average
  record.updatedAt = now
  record.status = input.status || record.status || "submitted"

  updateClassPositions(records, record.className, record.term, record.session)
  await writeReportCards(records)
  return toResponse(record)
}

export async function listReportCards(filters: ReportCardFilters = {}): Promise<ReportCardResponse[]> {
  const records = await readReportCards()
  const filtered = records.filter((record) => {
    if (filters.status && record.status !== filters.status) return false
    if (filters.className && record.className !== filters.className) return false
    if (filters.term && record.term !== filters.term) return false
    if (filters.session && record.session !== filters.session) return false
    return true
  })

  return filtered.sort((a, b) => a.studentName.localeCompare(b.studentName)).map(toResponse)
}

export async function getReportCard(
  studentId: string,
  term: string,
  session: string,
): Promise<ReportCardResponse | null> {
  const records = await readReportCards()
  const record = records.find((item) => item.studentId === studentId && item.term === term && item.session === session)
  return record ? toResponse(record) : null
}

export async function updateReportCardStatus(input: StatusUpdateInput): Promise<ReportCardResponse> {
  const records = await readReportCards()
  const record = records.find(
    (item) => item.studentId === input.studentId && item.term === input.term && item.session === input.session,
  )

  if (!record) {
    throw new Error("Report card not found for the specified student and period")
  }

  const now = new Date().toISOString()
  record.status = input.status
  record.updatedAt = now

  const approvalEntry: ApprovalHistory = {
    status: input.status === "revoked" ? "revoked" : "approved",
    actorId: input.actorId || "system",
    actorRole: input.actorRole || "Admin",
    message: input.message,
    timestamp: now,
  }

  record.approvals = [...(record.approvals || []), approvalEntry]

  if (input.status === "approved") {
    record.adminFeedback = input.message || undefined
  }

  if (input.status === "revoked") {
    record.adminFeedback = input.message || "Report card requires revision"
  }

  if (input.status === "published") {
    record.publishedAt = now
  }

  await writeReportCards(records)
  return toResponse(record)
}

export async function applyAdminOverride(input: AdminOverrideInput): Promise<ReportCardResponse> {
  const records = await readReportCards()
  const record = records.find(
    (item) => item.studentId === input.studentId && item.term === input.term && item.session === input.session,
  )

  if (!record) {
    throw new Error("Report card not found for override")
  }

  const now = new Date().toISOString()

  if (input.overrides.classTeacherRemarks) {
    record.classTeacherRemarks = input.overrides.classTeacherRemarks
  }

  if (input.overrides.metadata) {
    record.metadata = { ...record.metadata, ...input.overrides.metadata }
  }

  if (input.overrides.subjects) {
    record.subjects = record.subjects.map((subject) => {
      const override = input.overrides.subjects?.[subject.name]
      if (!override) return subject
      const updated = buildSubjectScore({
        name: subject.name,
        ca1: override.ca1 ?? subject.ca1,
        ca2: override.ca2 ?? subject.ca2,
        assignment: override.assignment ?? subject.assignment,
        exam: override.exam ?? subject.exam,
        remarks: override.remarks ?? subject.remarks,
        teacherId: subject.teacherId,
        teacherName: subject.teacherName,
      })
      return updated
    })
  }

  const aggregates = computeAggregates(record.subjects)
  record.totalObtained = aggregates.totalObtained
  record.totalObtainable = aggregates.totalObtainable
  record.average = aggregates.average
  record.updatedAt = now
  record.adminFeedback = input.reason

  record.approvals = [
    ...(record.approvals || []),
    {
      status: "revoked",
      actorId: input.adminId,
      actorRole: "Admin",
      message: input.reason,
      timestamp: now,
    },
  ]

  await writeReportCards(records)
  return toResponse(record)
}
