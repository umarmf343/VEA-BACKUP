export const runtime = "nodejs"

import { type NextRequest, NextResponse } from "next/server"
import { dbManager } from "@/lib/database-manager"
import { classCreateSchema, classUpdateSchema, formatZodErrors } from "@/lib/validation-schemas"

export async function GET() {
  try {
    const classes = await dbManager.getClasses()
    return NextResponse.json({ classes })
  } catch (error) {
    console.error("Failed to fetch classes:", error)
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const validation = classCreateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid class data",
          fieldErrors: formatZodErrors(validation.error),
        },
        { status: 400 },
      )
    }

    const { status, subjects, capacity, ...classData } = validation.data

    const newClass = await dbManager.createClass({
      ...classData,
      capacity: capacity ?? 30,
      subjects: subjects ?? [],
      status: status ?? "active",
    })

    return NextResponse.json({
      class: newClass,
      message: "Class created successfully",
    })
  } catch (error) {
    console.error("Failed to create class:", error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const validation = classUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Invalid class update data",
          fieldErrors: formatZodErrors(validation.error),
        },
        { status: 400 },
      )
    }

    const { id, ...updates } = validation.data

    const updatedClass = await dbManager.updateClass(id, updates)

    return NextResponse.json({
      class: updatedClass,
      message: "Class updated successfully",
    })
  } catch (error) {
    console.error("Failed to update class:", error)
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
  }
}
