import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { NotificationCenter } from "@/components/notification-center"

describe("NotificationCenter", () => {
  const fetchMock = global.fetch as jest.Mock

  beforeEach(() => {
    jest.useFakeTimers()
    fetchMock.mockReset()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  const baseNotification = {
    type: "info",
    title: "System update",
    message: "A new policy is available",
    timestamp: new Date().toISOString(),
    category: "system",
    actionRequired: false,
  }

  it("filters unread notifications", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        notifications: [
          { id: "1", read: false, ...baseNotification },
          { id: "2", read: true, ...baseNotification, title: "Read item" },
        ],
      }),
    })

    render(<NotificationCenter userRole="admin" />)

    expect(await screen.findByText("System update")).toBeInTheDocument()

    const toggle = screen.getByRole("button", { name: /unread only/i })
    fireEvent.click(toggle)

    await waitFor(() => {
      expect(screen.queryByText("Read item")).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: /show all/i }))
    expect(await screen.findByText("Read item")).toBeInTheDocument()
  })

  it("marks a notification as read", async () => {
    const notifications = [
      { id: "1", read: false, ...baseNotification },
      { id: "2", read: true, ...baseNotification, title: "Already read" },
    ]
    const updated = notifications.map((item) => ({ ...item, read: true }))

    fetchMock.mockImplementation((_, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ notifications: updated }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ notifications }),
      })
    })

    render(<NotificationCenter userRole="admin" />)

    const markReadButton = await screen.findByRole("button", { name: /mark read/i })
    fireEvent.click(markReadButton)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))

    expect(await screen.findAllByRole("button", { name: /unread/i })).toHaveLength(2)
  })
})
