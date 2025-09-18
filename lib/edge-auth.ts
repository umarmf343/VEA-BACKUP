import { jwtVerify, type JWTPayload } from "jose"

export class EdgeAuthError extends Error {
  status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = "EdgeAuthError"
    this.status = status
  }
}

export interface EdgeAccessTokenClaims extends JWTPayload {
  sub: string
  role: string
  roleLabel: string
  name: string
  jti: string
  email?: string
}

const textEncoder = new TextEncoder()

function resolveSecret(name: string, fallback: string): string {
  const env = typeof process !== "undefined" ? process.env : undefined
  const value = env?.[name]
  if (value && value.length > 0) {
    return value
  }

  if (env?.NODE_ENV === "production") {
    throw new EdgeAuthError(`${name} is not configured`, 500)
  }

  return fallback
}

const ACCESS_TOKEN_SECRET = () => resolveSecret("JWT_SECRET", "development-access-secret")

export async function verifyAccessToken(token: string): Promise<EdgeAccessTokenClaims> {
  let payload: JWTPayload
  try {
    const result = await jwtVerify(token, textEncoder.encode(ACCESS_TOKEN_SECRET()))
    payload = result.payload
  } catch {
    throw new EdgeAuthError("Unauthorized", 401)
  }

  if (
    payload.type !== "access" ||
    typeof payload.sub !== "string" ||
    typeof payload.role !== "string" ||
    typeof payload.roleLabel !== "string" ||
    typeof payload.name !== "string" ||
    payload.name.trim().length === 0 ||
    typeof payload.jti !== "string"
  ) {
    throw new EdgeAuthError("Unauthorized", 401)
  }

  const claims: EdgeAccessTokenClaims = {
    ...payload,
    sub: payload.sub,
    role: payload.role,
    roleLabel: payload.roleLabel,
    name: payload.name,
    jti: payload.jti,
  }

  if (typeof payload.email === "string") {
    claims.email = payload.email
  }

  return claims
}
