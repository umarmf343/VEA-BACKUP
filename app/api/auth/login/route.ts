import { type NextRequest, NextResponse } from "next/server"
import { AuthError, authService } from "@/lib/auth-service"
import { sanitizeInput } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const email = sanitizeInput(typeof body.email === "string" ? body.email : "")
    const password = typeof body.password === "string" ? body.password : ""

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const { user, tokens } = await authService.login(email, password)

    return NextResponse.json({
      user,
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.accessTokenExpiresAt,
      refreshExpiresAt: tokens.refreshTokenExpiresAt,
      message: "Login successful",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
