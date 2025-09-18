/** @jest-environment node */

import { afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals"

import { POST as assignmentsPost } from "@/app/api/assignments/route"
import { POST as classesPost, PUT as classesPut } from "@/app/api/classes/route"
import { POST as paymentsInitializePost } from "@/app/api/payments/initialize/route"
import { POST as paymentsVerifyPost } from "@/app/api/payments/verify/route"
import { POST as usersPost, PUT as usersPut } from "@/app/api/users/route"
import { DatabaseManager, dbManager } from "@/lib/database-manager"

function createRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Request
}

const originalPaystackKey = process.env.PAYSTACK_SECRET_KEY
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

beforeAll(() => {
  process.env.PAYSTACK_SECRET_KEY = ""
  process.env.NEXT_PUBLIC_APP_URL = "https://vea.example"
})

afterEach(() => {
  jest.restoreAllMocks()
  // Reset in-memory payment store used by payment routes
  delete (globalThis as { _PAYMENTS?: unknown })._PAYMENTS
})

describe("Users API", () => {
  it("creates a user when the payload is valid", async () => {
    const createUserSpy = jest.spyOn(DatabaseManager.prototype, "createUser").mockResolvedValue({
      id: "usr_1",
      name: "Ada Lovelace",
      email: "ada@example.com",
      role: "Teacher",
      status: "active",
      createdAt: new Date().toISOString(),
    })

    const response = await usersPost(
      createRequest({ name: "Ada Lovelace", email: "ada@example.com", role: "Teacher" }) as any,
    )

    expect(response.status).toBe(200)
    expect(createUserSpy).toHaveBeenCalledWith(expect.objectContaining({ name: "Ada Lovelace" }))
  })

  it("returns a validation error when the payload is invalid", async () => {
    const createUserSpy = jest.spyOn(DatabaseManager.prototype, "createUser")

    const response = await usersPost(createRequest({ name: "A", email: "not-an-email" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.email).toBeDefined()
    expect(createUserSpy).not.toHaveBeenCalled()
  })

  it("updates a user when the payload is valid", async () => {
    const updateUserSpy = jest.spyOn(DatabaseManager.prototype, "updateUser").mockResolvedValue({
      id: "usr_1",
      name: "Updated Name",
      email: "updated@example.com",
      role: "Teacher",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const response = await usersPut(
      createRequest({ id: "usr_1", name: "Updated Name", email: "updated@example.com" }) as any,
    )

    expect(response.status).toBe(200)
    expect(updateUserSpy).toHaveBeenCalledWith(
      "usr_1",
      expect.objectContaining({ name: "Updated Name", updatedAt: expect.any(String) }),
    )
  })

  it("returns a validation error when the update payload is empty", async () => {
    const updateUserSpy = jest.spyOn(DatabaseManager.prototype, "updateUser")

    const response = await usersPut(createRequest({ id: "usr_1" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.form).toBeDefined()
    expect(updateUserSpy).not.toHaveBeenCalled()
  })
})

describe("Assignments API", () => {
  it("creates an assignment with a valid payload", async () => {
    const mockAssignment = {
      id: "asmt_1",
      title: "Test Assignment",
      description: "A detailed description for the assignment.",
      subject: "Mathematics",
      classId: "class_1",
      teacherId: "teacher_1",
      dueDate: new Date().toISOString(),
      status: "active" as const,
      createdAt: new Date().toISOString(),
    }
    const createAssignmentSpy = jest
      .spyOn(dbManager, "createAssignment")
      .mockResolvedValue(mockAssignment)

    const response = await assignmentsPost(
      createRequest({
        title: mockAssignment.title,
        description: mockAssignment.description,
        subject: mockAssignment.subject,
        classId: mockAssignment.classId,
        teacherId: mockAssignment.teacherId,
        dueDate: mockAssignment.dueDate,
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(createAssignmentSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: mockAssignment.title, status: "active" }),
    )
  })

  it("returns a validation error for an invalid assignment payload", async () => {
    const createAssignmentSpy = jest.spyOn(dbManager, "createAssignment")

    const response = await assignmentsPost(createRequest({ description: "Too short" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.title).toBeDefined()
    expect(createAssignmentSpy).not.toHaveBeenCalled()
  })

  it("creates an assignment submission when the payload is valid", async () => {
    const mockSubmission = {
      id: "sub_1",
      assignmentId: "asmt_1",
      studentId: "student_1",
      files: ["file.pdf"],
      status: "submitted" as const,
      submittedAt: new Date().toISOString(),
    }
    const submissionSpy = jest
      .spyOn(dbManager, "createAssignmentSubmission")
      .mockResolvedValue(mockSubmission)

    const response = await assignmentsPost(
      createRequest({
        type: "submission",
        assignmentId: mockSubmission.assignmentId,
        studentId: mockSubmission.studentId,
        files: mockSubmission.files,
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(submissionSpy).toHaveBeenCalledWith(
      expect.objectContaining({ assignmentId: mockSubmission.assignmentId, status: "submitted" }),
    )
  })

  it("returns a validation error for an invalid submission payload", async () => {
    const submissionSpy = jest.spyOn(dbManager, "createAssignmentSubmission")

    const response = await assignmentsPost(createRequest({ type: "submission", studentId: "student_1" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.assignmentId).toBeDefined()
    expect(submissionSpy).not.toHaveBeenCalled()
  })
})

describe("Classes API", () => {
  it("creates a class with valid data", async () => {
    const mockClass = {
      id: "class_1",
      name: "JSS1A",
      level: "Junior Secondary",
      capacity: 35,
      classTeacherId: "teacher_1",
      subjects: ["Mathematics"],
      status: "active" as const,
    }
    const createClassSpy = jest.spyOn(dbManager, "createClass").mockResolvedValue(mockClass)

    const response = await classesPost(
      createRequest({
        name: mockClass.name,
        level: mockClass.level,
        capacity: mockClass.capacity,
        classTeacherId: mockClass.classTeacherId,
        subjects: mockClass.subjects,
      }) as any,
    )

    expect(response.status).toBe(200)
    expect(createClassSpy).toHaveBeenCalledWith(expect.objectContaining({ name: mockClass.name }))
  })

  it("returns a validation error when class data is invalid", async () => {
    const createClassSpy = jest.spyOn(dbManager, "createClass")

    const response = await classesPost(createRequest({ level: "Junior" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.name).toBeDefined()
    expect(createClassSpy).not.toHaveBeenCalled()
  })

  it("updates a class with valid data", async () => {
    const updatedClass = {
      id: "class_1",
      name: "Updated Class",
      level: "Senior Secondary",
      capacity: 40,
      classTeacherId: "teacher_2",
      subjects: ["Physics"],
      status: "active" as const,
    }
    const updateClassSpy = jest.spyOn(dbManager, "updateClass").mockResolvedValue(updatedClass)

    const response = await classesPut(createRequest({ id: updatedClass.id, name: updatedClass.name }) as any)

    expect(response.status).toBe(200)
    expect(updateClassSpy).toHaveBeenCalledWith(
      updatedClass.id,
      expect.objectContaining({ name: updatedClass.name }),
    )
  })

  it("returns a validation error when update data is empty", async () => {
    const updateClassSpy = jest.spyOn(dbManager, "updateClass")

    const response = await classesPut(createRequest({ id: "class_1" }) as any)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.form).toBeDefined()
    expect(updateClassSpy).not.toHaveBeenCalled()
  })
})

describe("Payments API", () => {
  it("initializes a payment with valid data", async () => {
    const request = new Request("http://localhost/api/payments/initialize", {
      method: "POST",
      body: JSON.stringify({ studentId: "STU_1", amount: 5000 }),
    })

    const response = await paymentsInitializePost(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.authorization_url).toContain("https://paystack.com/pay/dev-")
    expect(payload.reference).toBeDefined()
  })

  it("returns validation errors when initialization data is invalid", async () => {
    const request = new Request("http://localhost/api/payments/initialize", {
      method: "POST",
      body: JSON.stringify({ studentId: "", amount: 50 }),
    })

    const response = await paymentsInitializePost(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.studentId).toBeDefined()
  })

  it("verifies a payment using a reference", async () => {
    const now = new Date().toISOString()
    ;(globalThis as { _PAYMENTS?: unknown })._PAYMENTS = [
      {
        id: "PMT_1",
        studentId: "STU_1",
        amount: 5000,
        status: "pending",
        createdAt: now,
        reference: "REF_1",
      },
    ]

    const request = new Request("http://localhost/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ reference: "REF_1" }),
    })

    const response = await paymentsVerifyPost(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.status).toBe("paid")
  })

  it("returns validation errors when verify payload is empty", async () => {
    const request = new Request("http://localhost/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({}),
    })

    const response = await paymentsVerifyPost(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.fieldErrors.reference).toBeDefined()
  })
})

afterAll(() => {
  process.env.PAYSTACK_SECRET_KEY = originalPaystackKey
  process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
})
