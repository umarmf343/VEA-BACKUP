import { NextResponse } from "next/server"

import { hashPassword } from "@/lib/auth"
import { DatabaseManager } from "@/lib/database-manager"
import { sanitizeInput } from "@/lib/security"

const dbManager = new DatabaseManager()

export const runtime = "nodejs"

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined
  }
  return value.map((item) => sanitizeInput(String(item))).filter(Boolean)
}

function normalizeStatus(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }
  const normalized = sanitizeInput(value).toLowerCase()
  if (!normalized) {
    return undefined
  }
  if (normalized === "inactive" || normalized === "active" || normalized === "suspended") {
    return normalized as "active" | "inactive" | "suspended"
  }
  return undefined
}

function normalizeRole(value: unknown) {
  if (typeof value !== "string") {
    return undefined
  }
  const role = sanitizeInput(value)
  return role || undefined
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    if (role) {
      const users = await dbManager.getUsersByRole(role)
      return NextResponse.json({ users })
    }
    const users = await dbManager.getAllUsers()
    return NextResponse.json({ users })
  } catch (error) {
    console.error("Failed to fetch users", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const name = sanitizeInput(String(body.name ?? ""))
    const email = sanitizeInput(String(body.email ?? ""))
    const role = normalizeRole(body.role)
    const password = sanitizeInput(String(body.password ?? ""))

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: "Name, email, role and password are required" },
        { status: 400 },
      )
    }

    const passwordHash = await hashPassword(password)

    const user = await dbManager.createUser({
      name,
      email,
      role,
      status: normalizeStatus(body.status) ?? "active",
      passwordHash,
      studentIds: parseStringArray(body.studentIds),
      subjects: parseStringArray(body.subjects),
    })

    return NextResponse.json({
      user,
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Failed to create user", error)
    const message = error instanceof Error ? error.message : "Failed to create user"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

async function buildUpdates(payload: Record<string, unknown>) {
  const updates: Record<string, unknown> = {}

  if (typeof payload.name === "string") {
    const name = sanitizeInput(payload.name)
    if (name) updates.name = name
  }

  if (typeof payload.email === "string") {
    const email = sanitizeInput(payload.email)
    if (email) updates.email = email
  }

  if (typeof payload.role === "string") {
    const role = normalizeRole(payload.role)
    if (role) updates.role = role
  }

  if (payload.status !== undefined) {
    const status = normalizeStatus(payload.status)
    if (status) updates.status = status
  }

  if (payload.password) {
    const password = sanitizeInput(String(payload.password))
    if (password) {
      updates.passwordHash = await hashPassword(password)
    }
  }

  const studentIds = parseStringArray(payload.studentIds)
  if (studentIds) {
    updates.studentIds = studentIds
  }

  const subjects = parseStringArray(payload.subjects)
  if (subjects) {
    updates.subjects = subjects
  }

  return updates
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const id = sanitizeInput(String(body.id ?? ""))

    if (!id) {
      return NextResponse.json({ error: "User id is required" }, { status: 400 })
    }

    const updates = await buildUpdates(body)
    const user = await dbManager.updateUser(id, updates)

    return NextResponse.json({
      user,
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("Failed to update user", error)
    const message = error instanceof Error ? error.message : "Failed to update user"
    const status = message.toLowerCase().includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { id?: unknown; updates?: Record<string, unknown> }
    const id = sanitizeInput(String(body?.id ?? ""))

    if (!id || typeof body?.updates !== "object" || body.updates === null) {
      return NextResponse.json({ error: "User id and updates are required" }, { status: 400 })
    }

    const updates = await buildUpdates(body.updates)
    const user = await dbManager.updateUser(id, updates)

    return NextResponse.json({
      user,
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("Failed to patch user", error)
    const message = error instanceof Error ? error.message : "Failed to update user"
    const status = message.toLowerCase().includes("not found") ? 404 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
