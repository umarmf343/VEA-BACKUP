import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import PaymentModal from "@/components/payment-modal"

describe("PaymentModal", () => {
  const fetchMock = global.fetch as jest.Mock
  const originalLocation = window.location

  beforeEach(() => {
    fetchMock.mockReset()
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        href: "",
      },
    })
  })

  afterAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    })
  })

  function openModal() {
    render(<PaymentModal studentId="STU-1" />)
    fireEvent.click(screen.getByRole("button", { name: /pay school fees/i }))
  }

  it("validates the entered amount", async () => {
    openModal()

    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Please enter a valid amount")
  })

  it("redirects to the authorization URL when initialization succeeds", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authorization_url: "https://paystack.com/pay/demo" }),
    })

    openModal()

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "5000" } })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => expect(window.location.href).toBe("https://paystack.com/pay/demo"))
  })

  it("shows an error when the API returns a failure", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => "Gateway unavailable",
      json: async () => ({}),
    })

    openModal()

    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "5000" } })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Gateway unavailable")
  })
})
