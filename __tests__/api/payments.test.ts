/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

jest.mock("@/lib/admin-service", () => ({
  recordPaymentSettlementActivity: jest.fn(),
}))

import { GET as listPayments } from "@/app/api/payments/route"
import { POST as initializePayment } from "@/app/api/payments/initialize/route"
import { POST as markPaymentSettled } from "@/app/api/payments/mark-paid/route"
import { recordPaymentSettlementActivity } from "@/lib/admin-service"
import * as paymentsStore from "@/lib/payments-store"

const { __setPaymentsForTests, resetPaymentsStore } = paymentsStore

describe("payments API", () => {
  beforeEach(() => {
    resetPaymentsStore()
    process.env.PAYSTACK_SECRET_KEY = ""
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
    jest.clearAllMocks()
  })

  it("initializes a payment with a mock authorization URL", async () => {
    const response = await initializePayment(
      new NextRequest("http://localhost/api/payments/initialize", {
        method: "POST",
        body: JSON.stringify({ studentId: "STU-1", amount: 1500 }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.authorization_url).toMatch(/paystack.com\/pay\/dev-/)
    expect(json.reference).toBeTruthy()
  })

  it("validates the initialize payload", async () => {
    const response = await initializePayment(
      new NextRequest("http://localhost/api/payments/initialize", {
        method: "POST",
        body: JSON.stringify({ studentId: "", amount: 10 }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.message).toMatch(/invalid payload/i)
  })

  it("filters payments by status", async () => {
    __setPaymentsForTests([
      { id: "1", studentId: "STU-1", amount: 1000, status: "pending", createdAt: new Date().toISOString() },
      { id: "2", studentId: "STU-2", amount: 2000, status: "paid", createdAt: new Date().toISOString() },
    ])

    const response = await listPayments(
      new NextRequest("http://localhost/api/payments?status=paid")
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toHaveLength(1)
    expect(json[0]).toMatchObject({ id: "2", status: "paid" })
  })

  it("marks a payment as paid and records settlement activity", async () => {
    const now = new Date().toISOString()
    __setPaymentsForTests([
      { id: "pmt_success", studentId: "STU-9", amount: 4200, status: "pending", createdAt: now },
    ])

    const response = await markPaymentSettled(
      new NextRequest("http://localhost/api/payments/mark-paid", {
        method: "POST",
        body: JSON.stringify({ id: "pmt_success" }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.payment).toMatchObject({ id: "pmt_success", status: "paid", studentId: "STU-9" })
    expect(recordPaymentSettlementActivity).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pmt_success", amount: 4200, studentId: "STU-9" })
    )
  })

  it("returns 400 when the payload is missing an id", async () => {
    const response = await markPaymentSettled(
      new NextRequest("http://localhost/api/payments/mark-paid", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Payment id is required" })
    expect(recordPaymentSettlementActivity).not.toHaveBeenCalled()
  })

  it("returns 404 when the payment does not exist", async () => {
    __setPaymentsForTests([])

    const response = await markPaymentSettled(
      new NextRequest("http://localhost/api/payments/mark-paid", {
        method: "POST",
        body: JSON.stringify({ id: "missing" }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: "Payment not found" })
    expect(recordPaymentSettlementActivity).not.toHaveBeenCalled()
  })

  it("returns 500 when settlement activity logging fails unexpectedly", async () => {
    const now = new Date().toISOString()
    __setPaymentsForTests([
      { id: "pmt_error", studentId: "STU-5", amount: 9000, status: "pending", createdAt: now },
    ])

    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    ;(recordPaymentSettlementActivity as jest.Mock).mockImplementationOnce(() => {
      throw new Error("activity store offline")
    })

    const response = await markPaymentSettled(
      new NextRequest("http://localhost/api/payments/mark-paid", {
        method: "POST",
        body: JSON.stringify({ id: "pmt_error" }),
        headers: { "Content-Type": "application/json" },
      })
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({ error: "Failed to mark payment as paid" })
    consoleSpy.mockRestore()
  })

  it("returns 400 when the request body cannot be parsed", async () => {
    const brokenRequest = {
      json: () => {
        throw new SyntaxError("Unexpected token")
      },
    } as unknown as NextRequest

    const response = await markPaymentSettled(brokenRequest)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: "Invalid JSON payload" })
    expect(recordPaymentSettlementActivity).not.toHaveBeenCalled()
  })
})
