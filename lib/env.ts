"use server"

import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  ENCRYPTION_KEY: z.string().min(1, "ENCRYPTION_KEY is required"),
  PAYSTACK_SECRET_KEY: z.string().min(1, "PAYSTACK_SECRET_KEY is required"),
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY is required"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .min(1, "NEXT_PUBLIC_APP_URL is required")
    .url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  REPORT_CARD_DATA_DIR: z.string().min(1).optional(),
})

type EnvSchema = z.infer<typeof envSchema>

const rawEnv: Record<keyof EnvSchema, string | undefined> = {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
  NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  REPORT_CARD_DATA_DIR: process.env.REPORT_CARD_DATA_DIR,
}

const shouldSkipValidation = (() => {
  const value = process.env.SKIP_ENV_VALIDATION
  if (!value) return false
  return ["1", "true", "yes", "on"].includes(value.toLowerCase())
})()

const formatIssues = (issues: z.ZodIssue[]) =>
  issues
    .map((issue) => {
      const path = issue.path.join(".") || "environment"
      return `- ${path}: ${issue.message}`
    })
    .join("\n")

let resolvedEnv: EnvSchema
const parsed = envSchema.safeParse(rawEnv)

if (parsed.success) {
  resolvedEnv = parsed.data
} else {
  const message = formatIssues(parsed.error.issues)
  if (!shouldSkipValidation) {
    throw new Error(`Invalid environment configuration:\n${message}`)
  }

  console.warn(`[env] Validation skipped due to SKIP_ENV_VALIDATION. Issues found:\n${message}`)

  resolvedEnv = {
    NODE_ENV: rawEnv.NODE_ENV ?? "development",
    DATABASE_URL: rawEnv.DATABASE_URL ?? "",
    JWT_SECRET: rawEnv.JWT_SECRET ?? "",
    ENCRYPTION_KEY: rawEnv.ENCRYPTION_KEY ?? "",
    PAYSTACK_SECRET_KEY: rawEnv.PAYSTACK_SECRET_KEY ?? "",
    NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY: rawEnv.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
    NEXT_PUBLIC_APP_URL: rawEnv.NEXT_PUBLIC_APP_URL ?? "",
    REPORT_CARD_DATA_DIR: rawEnv.REPORT_CARD_DATA_DIR,
  }
}

export type Env = EnvSchema

export const env: Env = Object.freeze(resolvedEnv)
