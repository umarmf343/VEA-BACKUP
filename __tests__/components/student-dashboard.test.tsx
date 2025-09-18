import { render, screen, waitFor, fireEvent } from "@testing-library/react"

import StudentDashboard from "@/components/student-dashboard"

describe("StudentDashboard", () => {
  const fetchMock = global.fetch as jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    fetchMock.mockReset()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  it("renders metrics after loading data", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assignmentsDue: 3, notices: 2, paymentsPending: 1 }),
    })

    render(<StudentDashboard />)

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const assignmentsCard = await screen.findByText("Assignments Due")
    expect(assignmentsCard.nextElementSibling).toHaveTextContent("3")
    expect(screen.getByText("Notices").nextElementSibling).toHaveTextContent("2")
    expect(screen.getByText("Payments Pending").nextElementSibling).toHaveTextContent("1")
  })

  it("shows an error message when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => "Failed to load",
      json: async () => ({}),
    })

    render(<StudentDashboard />)

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Failed to load")
  })

  it("reloads data when the refresh button is clicked", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assignmentsDue: 1, notices: 1, paymentsPending: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ assignmentsDue: 5, notices: 0, paymentsPending: 2 }),
      })

    render(<StudentDashboard />)

    await screen.findByText("Assignments Due")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: /refresh dashboard/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const assignmentsValue = screen.getByText("Assignments Due").nextElementSibling
    const paymentsValue = screen.getByText("Payments Pending").nextElementSibling
    await waitFor(() => expect(assignmentsValue).toHaveTextContent("5"))
    await waitFor(() => expect(paymentsValue).toHaveTextContent("2"))
  })
})
