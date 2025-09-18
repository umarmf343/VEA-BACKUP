export const runtime = "nodejs"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { UserRole, UserStatus } from "@prisma/client"

import { userRepository } from "@/lib/repositories"

function normaliseUser(user: Awaited<ReturnType<typeof userRepository.findUserById>>) {
  if (!user) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.toLowerCase(),
    status: user.status === UserStatus.INACTIVE ? "inactive" : "active",
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

function parseRole(role?: string | null) {
  if (!role) return undefined
  const candidate = role.toUpperCase()
  return (Object.values(UserRole) as string[]).includes(candidate) ? (candidate as UserRole) : undefined
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")
    const userId = searchParams.get("userId")

    if (userId) {
      const user = await userRepository.findUserById(userId)
      return NextResponse.json({ users: user ? [normaliseUser(user)] : [] })
    }

    const roleEnum = parseRole(role)
    const users = await userRepository.listUsers(roleEnum)
    return NextResponse.json({ users: users.map((user) => normaliseUser(user)) })
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, role, password, ...additionalData } = body

    const userData = {
      name,
      email,
      role,
      status: "active",
      createdAt: new Date().toISOString(),
      ...additionalData,
    }

    const { status: requestStatus, ...metadata } = additionalData
    const newUser = await userRepository.createUser({
      name,
      email,
      role: parseRole(role) ?? UserRole.STUDENT,
      status: requestStatus === "inactive" ? UserStatus.INACTIVE : UserStatus.ACTIVE,
      metadata,
    })

    return NextResponse.json({
      user: normaliseUser(newUser),
      message: "User created successfully",
    })
  } catch (error) {
    console.error("Failed to create user:", error)
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    updateData.updatedAt = new Date().toISOString()

    const updatedUser = await userRepository.updateUser(id, {
      ...updateData,
      role: parseRole(updateData.role),
      status:
        updateData.status === undefined
          ? undefined
          : updateData.status === "inactive"
            ? UserStatus.INACTIVE
            : UserStatus.ACTIVE,
    })

    return NextResponse.json({
      user: normaliseUser(updatedUser),
      message: "User updated successfully",
    })
  } catch (error) {
    console.error("Failed to update user:", error)
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
  }
}
