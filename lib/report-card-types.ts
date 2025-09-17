export type ReportCardStatus = "draft" | "submitted" | "approved" | "revoked" | "published"

export interface SubjectScore {
  name: string
  ca1: number
  ca2: number
  assignment: number
  exam: number
  caTotal: number
  total: number
  grade: string
  remarks: string
  teacherId: string
  teacherName?: string
  updatedAt: string
}

export interface AffectiveDomain {
  neatness: string
  honesty: string
  punctuality: string
}

export interface PsychomotorDomain {
  sport: string
  handwriting: string
}

export interface ApprovalHistory {
  status: "approved" | "revoked"
  actorId: string
  actorRole: string
  message?: string
  timestamp: string
}

export interface ReportCardRecord {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  term: string
  session: string
  status: ReportCardStatus
  teacherId: string
  teacherName?: string
  subjects: SubjectScore[]
  affectiveDomain: AffectiveDomain
  psychomotorDomain: PsychomotorDomain
  classTeacherRemarks: string
  totalObtained: number
  totalObtainable: number
  average: number
  position: string
  submittedAt?: string
  updatedAt: string
  publishedAt?: string
  adminFeedback?: string
  approvals: ApprovalHistory[]
  metadata?: {
    resumptionDate?: string
    vacationDate?: string
    numberInClass?: number
    [key: string]: unknown
  }
}

export interface ReportCardResponse {
  id: string
  student: {
    id: string
    name: string
    admissionNumber: string
    class: string
    term: string
    session: string
    status: ReportCardStatus
    numberInClass?: number
  }
  subjects: SubjectScore[]
  affectiveDomain: AffectiveDomain
  psychomotorDomain: PsychomotorDomain
  classTeacherRemarks: string
  totalObtained: number
  totalObtainable: number
  average: number
  position: string
  status: ReportCardStatus
  teacher: {
    id: string
    name?: string
  }
  submittedAt?: string
  updatedAt: string
  publishedAt?: string
  adminFeedback?: string
  approvals: ApprovalHistory[]
  metadata?: ReportCardRecord["metadata"]
}
