/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

import { GET, POST } from "@/app/api/marks/route"

jest.mock("@/lib/api-auth", () => {
  const actual = jest.requireActual("@/lib/api-auth")
  return {
    ...actual,
    requireAuth: jest.fn(),
  }
})

jest.mock("@/lib/security", () => {
  const actual = jest.requireActual("@/lib/security")
  return {
    ...actual,
    hasPermission: jest.fn(),
  }
})

jest.mock("@/lib/report-card-service", () => {
  const actual = jest.requireActual("@/lib/report-card-service")
  return {
    ...actual,
    submitSubjectAssessment: jest.fn(),
    getReportCard: jest.fn(),
  }
})

const { requireAuth } = jest.requireMock("@/lib/api-auth") as {
  requireAuth: jest.Mock
}
const { hasPermission } = jest.requireMock("@/lib/security") as {
  hasPermission: jest.Mock
}
const { submitSubjectAssessment, getReportCard } = jest.requireMock(
  "@/lib/report-card-service"
) as {
  submitSubjectAssessment: jest.Mock
  getReportCard: jest.Mock
}

describe("/api/marks route", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    requireAuth.mockReturnValue({ userId: "teacher-1", role: "Teacher", name: "Ms Smith" })
    hasPermission.mockReturnValue(true)
  })

  it("submits marks when authorized", async () => {
    const saved = { id: "report-1", subjects: [] }
    submitSubjectAssessment.mockResolvedValue(saved as any)

    const response = await POST(
      new NextRequest("http://localhost/api/marks", {
        method: "POST",
        body: JSON.stringify({
          studentId: "student-1",
          subject: "Math",
          ca1: 15,
          ca2: 16,
          assignment: 9,
          exam: 45,
          remarks: "Great work",
          term: "First Term",
          session: "2023/2024",
        }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.message).toBe("Marks saved successfully")
    expect(submitSubjectAssessment).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        subject: "Math",
        teacherId: "teacher-1",
        term: "First Term",
      })
    )
  })

  it("returns 403 when teacher lacks permission", async () => {
    hasPermission.mockReturnValue(false)

    const response = await POST(
      new NextRequest("http://localhost/api/marks", {
        method: "POST",
        body: JSON.stringify({
          studentId: "student-1",
          subject: "Math",
          ca1: 15,
          ca2: 16,
          assignment: 9,
          exam: 45,
          remarks: "Great work",
          term: "First Term",
          session: "2023/2024",
        }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json).toEqual({ error: "Insufficient permissions" })
    expect(submitSubjectAssessment).not.toHaveBeenCalled()
  })

  it("returns marks for a student", async () => {
    getReportCard.mockResolvedValue({
      id: "report-1",
      subjects: [{ subject: "Math", total: 85 }],
    } as any)

    const response = await GET(
      new NextRequest(
        "http://localhost/api/marks?studentId=student-1&term=First%20Term&session=2023/2024"
      )
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.reportCard.subjects[0]).toEqual({ subject: "Math", total: 85 })
    expect(getReportCard).toHaveBeenCalledWith("student-1", "First Term", "2023/2024")
  })

  it("prevents students from accessing other records", async () => {
    requireAuth.mockReturnValue({ userId: "student-2", role: "Student" })

    const response = await GET(
      new NextRequest(
        "http://localhost/api/marks?studentId=student-1&term=First%20Term&session=2023/2024"
      )
    )

    expect(response.status).toBe(403)
    const json = await response.json()
    expect(json).toEqual({ error: "Insufficient permissions" })
  })

  it("validates required query params", async () => {
    const response = await GET(new NextRequest("http://localhost/api/marks"))

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.error).toMatch(/query parameters are required/i)
  })
})
