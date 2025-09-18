/**
 * @jest-environment node
 */

import { NextRequest } from "next/server"

import { GET as listPayments } from "@/app/api/payments/route"
import { POST as initializePayment } from "@/app/api/payments/initialize/route"

describe("payments API", () => {
  beforeEach(() => {
    delete (globalThis as any)._PAYMENTS
    process.env.PAYSTACK_SECRET_KEY = ""
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
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
    ;(globalThis as any)._PAYMENTS = [
      { id: "1", studentId: "STU-1", amount: 1000, status: "pending", createdAt: new Date().toISOString() },
      { id: "2", studentId: "STU-2", amount: 2000, status: "paid", createdAt: new Date().toISOString() },
    ]

    const response = await listPayments(
      new NextRequest("http://localhost/api/payments?status=paid")
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json).toHaveLength(1)
    expect(json[0]).toMatchObject({ id: "2", status: "paid" })
  })
})
