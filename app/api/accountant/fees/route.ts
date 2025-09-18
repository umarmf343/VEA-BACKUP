import { NextRequest, NextResponse } from "next/server"

import {
  listAccountantFeeStructure,
  saveAccountantFeeStructure,
  type FeeStructureInput,
} from "@/lib/accountant-service"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function parseAmount(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : NaN
  }

  return NaN
}

function sanitiseClass(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function GET() {
  try {
    const feeStructure = await listAccountantFeeStructure()
    return NextResponse.json({ feeStructure })
  } catch (error) {
    console.error("Failed to load accountant fee structure", error)
    return NextResponse.json({ error: "Unable to load fee structure." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<FeeStructureInput>

    const className = sanitiseClass(body?.class)
    if (!className) {
      return NextResponse.json({ error: "Class name is required." }, { status: 400 })
    }

    const tuition = parseAmount(body?.tuition)
    const development = parseAmount(body?.development)
    const exam = parseAmount(body?.exam)
    const sports = parseAmount(body?.sports)
    const library = parseAmount(body?.library)

    const amounts = { tuition, development, exam, sports, library }
    for (const [key, value] of Object.entries(amounts)) {
      if (!Number.isFinite(value) || value < 0) {
        return NextResponse.json({ error: `${key} must be zero or a positive number.` }, { status: 400 })
      }
    }

    const fee = await saveAccountantFeeStructure({
      id: typeof body?.id === "string" && body.id.trim() ? body.id.trim() : undefined,
      class: className,
      tuition,
      development,
      exam,
      sports,
      library,
    })

    return NextResponse.json({ fee }, { status: 201 })
  } catch (error) {
    console.error("Failed to save accountant fee structure", error)
    return NextResponse.json({ error: "Unable to save fee structure." }, { status: 500 })
  }
}
