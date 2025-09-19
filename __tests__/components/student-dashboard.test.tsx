import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"

import StudentDashboard from "@/components/student-dashboard"

describe("StudentDashboard", () => {
  const fetchMock = global.fetch as jest.Mock

  async function flushAsync() {
    await act(async () => {
      await Promise.resolve()
    })
  }

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
    await flushAsync()

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const assignmentsCard = await screen.findByText("Assignments Due")
    expect(assignmentsCard.nextElementSibling).toHaveTextContent("3")
    expect(screen.getByText("Notices").nextElementSibling).toHaveTextContent("2")
    expect(screen.getByText("Payments Pending").nextElementSibling).toHaveTextContent("1")
  })

  it("renders provided initial metrics immediately", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ assignmentsDue: 4, notices: 1, paymentsPending: 2, lastSync: "2025-01-01T10:00:00.000Z" }),
    })

    render(
      <StudentDashboard
        initialData={{ assignmentsDue: 7, notices: 4, paymentsPending: 3, lastSync: "2025-01-01T09:00:00.000Z" }}
      />
    )
    expect(screen.getByText("Assignments Due").nextElementSibling).toHaveTextContent("7")
    expect(screen.getByText("Notices").nextElementSibling).toHaveTextContent("4")
    expect(screen.getByText("Payments Pending").nextElementSibling).toHaveTextContent("3")
    expect(screen.getByText(/Last synced/i)).toBeInTheDocument()

    await flushAsync()
    await waitFor(() => expect(screen.getByText("Assignments Due").nextElementSibling).toHaveTextContent("4"))
  })

  it("shows an error message when the request fails", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      text: async () => "Failed to load",
      json: async () => ({}),
    })

    render(<StudentDashboard />)
    await flushAsync()

    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Failed to load")
    expect(screen.queryByText("Assignments Due")).not.toBeInTheDocument()
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
    await flushAsync()

    await screen.findByText("Assignments Due")
    expect(fetchMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: /refresh dashboard/i }))
    await flushAsync()

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    const assignmentsValue = screen.getByText("Assignments Due").nextElementSibling
    const paymentsValue = screen.getByText("Payments Pending").nextElementSibling
    await waitFor(() => expect(assignmentsValue).toHaveTextContent("5"))
    await waitFor(() => expect(paymentsValue).toHaveTextContent("2"))
  })
})
