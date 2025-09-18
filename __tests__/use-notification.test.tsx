import { createNotificationHandlers } from "@/hooks/use-notification"
import { toast } from "sonner"

jest.mock("sonner", () => {
  const base = jest.fn()
  return {
    toast: Object.assign(base, {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
    }),
  }
})

describe("useNotification", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("shows a success notification with contextual details", () => {
    const { notifySuccess } = createNotificationHandlers()

    notifySuccess("Settings saved", {
      description: "All configuration changes are now active.",
    })

    expect(toast.success).toHaveBeenCalledWith("Settings saved", {
      description: "All configuration changes are now active.",
      duration: 5000,
      closeButton: true,
    })
  })

  it("allows overriding duration and uses warning variant", () => {
    const { notify } = createNotificationHandlers()

    notify("Meeting requires attention", {
      variant: "warning",
      duration: 2000,
    })

    expect(toast.warning).toHaveBeenCalledWith("Meeting requires attention", {
      description: undefined,
      duration: 2000,
      closeButton: true,
    })
  })

  it("falls back to info notifications when no variant is specified", () => {
    const { notify } = createNotificationHandlers()

    notify("Fetching the latest report card")

    expect(toast.info).toHaveBeenCalledWith("Fetching the latest report card", {
      description: undefined,
      duration: 5000,
      closeButton: true,
    })
  })
})
