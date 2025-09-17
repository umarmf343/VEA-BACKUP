import type { ReportCardResponse } from "@/lib/report-card-types"
import {
  AdminOverrideInput,
  CompleteReportCardInput,
  applyAdminOverride,
  getReportCard,
  saveCompleteReportCard,
  submitSubjectAssessment,
} from "@/lib/report-card-service"

export interface TeacherMarksPayload {
  class: string
  subject: string
  term: string
  session: string
  marks: Array<{
    studentId: number | string
    studentName: string
    firstCA: number
    secondCA: number
    noteAssignment: number
    exam: number
    teacherRemark: string
  }>
  teacherId: string
  teacherName?: string
  admissionNumbers?: Record<string, string>
}

export interface ReportCardSettings {
  schoolLogo?: string
  headmasterSignature?: string
  defaultRemarks: string
  gradingScale: {
    A: { min: number; max: number; description: string }
    B: { min: number; max: number; description: string }
    C: { min: number; max: number; description: string }
    D: { min: number; max: number; description: string }
    E: { min: number; max: number; description: string }
    F: { min: number; max: number; description: string }
  }
}

let reportCardSettings: ReportCardSettings = {
  defaultRemarks: "Keep up the good work and continue to strive for excellence.",
  gradingScale: {
    A: { min: 75, max: 100, description: "Excellent" },
    B: { min: 60, max: 74, description: "Very Good" },
    C: { min: 50, max: 59, description: "Good" },
    D: { min: 40, max: 49, description: "Fair" },
    E: { min: 30, max: 39, description: "Poor" },
    F: { min: 0, max: 29, description: "Fail" },
  },
}

export const calculateGrade = (total: number): string => {
  const { gradingScale } = reportCardSettings
  for (const [grade, range] of Object.entries(gradingScale)) {
    if (total >= range.min && total <= range.max) {
      return grade
    }
  }
  return "F"
}

export const saveTeacherMarks = async (marksData: TeacherMarksPayload) => {
  try {
    await Promise.all(
      marksData.marks.map((studentMark) =>
        submitSubjectAssessment({
          studentId: studentMark.studentId.toString(),
          studentName: studentMark.studentName,
          admissionNumber: marksData.admissionNumbers?.[studentMark.studentId.toString()],
          className: marksData.class,
          subject: marksData.subject,
          ca1: studentMark.firstCA,
          ca2: studentMark.secondCA,
          assignment: studentMark.noteAssignment,
          exam: studentMark.exam,
          remarks: studentMark.teacherRemark,
          term: marksData.term,
          session: marksData.session,
          teacherId: marksData.teacherId,
          teacherName: marksData.teacherName,
        }),
      ),
    )

    return { success: true, message: "Marks saved and will appear on report cards" }
  } catch (error) {
    console.error("Error saving marks:", error)
    return { success: false, message: "Error saving marks" }
  }
}

export const getStudentReportCardData = async (
  studentId: string,
  term: string,
  session: string,
): Promise<ReportCardResponse | null> => {
  try {
    return await getReportCard(studentId, term, session)
  } catch (error) {
    console.error("Failed to load student report card", error)
    return null
  }
}

export const saveCompleteReportCardData = async (payload: CompleteReportCardInput) => {
  return saveCompleteReportCard(payload)
}

export const adminOverrideMarks = async (overrideInput: AdminOverrideInput) => {
  return applyAdminOverride(overrideInput)
}

export const updateReportCardSettings = (settings: Partial<ReportCardSettings>) => {
  reportCardSettings = { ...reportCardSettings, ...settings }
}

export const getReportCardSettings = () => reportCardSettings
