"use client"

import { useMemo } from "react"
import { toast } from "sonner"
import type { ReactNode } from "react"

export type NotificationVariant = "success" | "error" | "warning" | "info"

export interface NotificationOptions {
  description?: ReactNode
  duration?: number
}

const DEFAULT_DURATION = 5000

export function createNotificationHandlers() {
  const notify = (
    message: ReactNode,
    { description, duration, variant = "info" as NotificationVariant }: NotificationOptions & {
      variant?: NotificationVariant
    } = {},
  ) => {
    const commonOptions = {
      description,
      duration: duration ?? DEFAULT_DURATION,
      closeButton: true,
    } as const

    switch (variant) {
      case "success":
        return toast.success(message, commonOptions)
      case "error":
        return toast.error(message, commonOptions)
      case "warning":
        return toast.warning(message, commonOptions)
      case "info":
      default:
        return toast.info(message, commonOptions)
    }
  }

  const notifySuccess = (message: ReactNode, options?: NotificationOptions) =>
    notify(message, { ...options, variant: "success" })
  const notifyError = (message: ReactNode, options?: NotificationOptions) =>
    notify(message, { ...options, variant: "error" })
  const notifyWarning = (message: ReactNode, options?: NotificationOptions) =>
    notify(message, { ...options, variant: "warning" })
  const notifyInfo = (message: ReactNode, options?: NotificationOptions) =>
    notify(message, { ...options, variant: "info" })

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
  }
}

export function useNotification() {
  return useMemo(() => createNotificationHandlers(), [])
}

export type UseNotificationReturn = ReturnType<typeof useNotification>
