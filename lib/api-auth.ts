import { type NextRequest } from "next/server"

import { AuthError, authService } from "./auth-service"

export type AuthContext = {
  userId: string
  role: string
  name?: string
}

export type HttpError = { status: number; message: string }

export function isHttpError(error: unknown): error is HttpError {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number" &&
    typeof (error as { message?: unknown }).message === "string"
  )
}

export function requireAuth(request: NextRequest): AuthContext {
  const authHeader = request.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    throw { status: 401, message: "Unauthorized" }
  }

  const token = authHeader.substring(7)

  try {
    const decoded = authService.verifyAccessToken(token)

    return {
      userId: decoded.sub,
      role: decoded.role,
      name: decoded.name,
    }
  } catch (error) {
    if (error instanceof AuthError) {
      throw { status: error.status, message: error.message }
    }
    throw { status: 401, message: "Unauthorized" }
  }
}
