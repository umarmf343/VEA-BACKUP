export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { DatabaseManager, type GradeRecord } from "@/lib/database-manager"

const dbManager = new DatabaseManager()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const classId = searchParams.get("classId")

    let grades = []

    if (studentId) {
      grades = await dbManager.getStudentGrades(studentId)
    } else if (classId) {
      grades = await dbManager.getClassGrades(classId)
    } else {
      grades = await dbManager.getAllGrades()
    }

    return NextResponse.json({ grades })
  } catch (error) {
    console.error("Failed to fetch grades:", error)
    return NextResponse.json({ error: "Failed to fetch grades" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      studentId,
      subject,
      classId,
      term,
      firstCA,
      secondCA,
      assignment,
      exam,
      remarks,
      teacherId,
    } = body

    // Calculate totals and grade
    const caTotal = (firstCA || 0) + (secondCA || 0) + (assignment || 0)
    const total = caTotal + (exam || 0)

    let grade = "F"
    if (total >= 75) grade = "A"
    else if (total >= 60) grade = "B"
    else if (total >= 50) grade = "C"
    else if (total >= 40) grade = "D"
    else if (total >= 30) grade = "E"

    const gradeData = {
      studentId,
      subject,
      classId,
      term,
      ca1: firstCA,
      ca2: secondCA,
      exam,
      total,
      grade,
      remarks,
      teacherId,
    }

    const savedGrade = await dbManager.saveGrade(gradeData)

    return NextResponse.json({ grade: savedGrade, message: "Grade saved successfully" })
  } catch (error) {
    console.error("Failed to save grade:", error)
    return NextResponse.json({ error: "Failed to save grade" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...rawData } = body

    const gradeUpdates: Partial<GradeRecord> & {
      ca1?: number
      ca2?: number
      exam?: number
    } = {}

    if (rawData.classId !== undefined) gradeUpdates.classId = rawData.classId
    if (rawData.term !== undefined) gradeUpdates.term = rawData.term
    if (rawData.firstCA !== undefined) gradeUpdates.ca1 = rawData.firstCA
    if (rawData.secondCA !== undefined) gradeUpdates.ca2 = rawData.secondCA
    if (rawData.exam !== undefined) gradeUpdates.exam = rawData.exam
    if (rawData.total !== undefined) gradeUpdates.total = rawData.total
    if (rawData.grade !== undefined) gradeUpdates.grade = rawData.grade
    if (rawData.remarks !== undefined) gradeUpdates.remarks = rawData.remarks
    if (rawData.teacherId !== undefined) gradeUpdates.teacherId = rawData.teacherId

    const updatedGrade = await dbManager.updateGrade(id, gradeUpdates)

    return NextResponse.json({ message: "Grade updated successfully", data: updatedGrade })
  } catch (error) {
    console.error("Failed to update grade:", error)
    return NextResponse.json({ error: "Failed to update grade" }, { status: 500 })
  }
}
