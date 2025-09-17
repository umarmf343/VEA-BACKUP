import { type NextRequest } from "next/server"

import { verifyToken } from "./security"

export type AuthContext = {
  userId: string
  role: string
  name?: string
}

export type HttpError = { status: number; message: string }

type TokenPayload = {
  userId?: string
  id?: string
  role?: string
  name?: string
}

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
    const decoded = verifyToken(token) as TokenPayload
    const role = decoded.role || ""
    const userId = decoded.userId || decoded.id || ""

    if (!role || !userId) {
      throw { status: 403, message: "Insufficient permissions" }
    }

    return {
      userId,
      role,
      name: decoded.name,
    }
  } catch (error) {
    if (isHttpError(error)) {
      throw error
    }
    throw { status: 401, message: "Unauthorized" }
  }
}
