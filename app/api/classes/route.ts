export const runtime = "nodejs"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { ClassStatus } from "@prisma/client"

import { classRepository } from "@/lib/repositories"

function mapClass(klass: Awaited<ReturnType<typeof classRepository.listClasses>>[number]) {
  return {
    id: klass.id,
    name: klass.name,
    level: klass.level ?? "",
    capacity: klass.capacity ?? 0,
    classTeacherId: klass.teacherId ?? null,
    subjects: Array.isArray(klass.subjects) ? klass.subjects : [],
    status: klass.status === ClassStatus.INACTIVE ? "inactive" : "active",
  }
}

export async function GET() {
  try {
    const classes = await classRepository.listClasses()
    return NextResponse.json({ classes: classes.map(mapClass) })
  } catch (error) {
    console.error("Failed to fetch classes:", error)
    return NextResponse.json({ error: "Failed to fetch classes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, level, capacity, classTeacherId, subjects } = body

    const newClass = await classRepository.createClass({
      name,
      level,
      capacity: capacity || 30,
      teacherId: classTeacherId || undefined,
      subjects: subjects || [],
      status: ClassStatus.ACTIVE,
    })

    return NextResponse.json({
      class: mapClass(newClass),
      message: "Class created successfully",
    })
  } catch (error) {
    console.error("Failed to create class:", error)
    return NextResponse.json({ error: "Failed to create class" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    const updatedClass = await classRepository.updateClass(id, {
      name: updateData.name,
      level: updateData.level,
      capacity: updateData.capacity,
      subjects: updateData.subjects,
      teacherId: updateData.classTeacherId,
      status:
        updateData.status === undefined
          ? undefined
          : updateData.status === "inactive"
            ? ClassStatus.INACTIVE
            : ClassStatus.ACTIVE,
    })

    return NextResponse.json({
      class: mapClass(updatedClass),
      message: "Class updated successfully",
    })
  } catch (error) {
    console.error("Failed to update class:", error)
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 })
  }
}
