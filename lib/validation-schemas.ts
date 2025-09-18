import { z, type ZodError } from "zod"

const nonEmptyString = z.string().trim().min(1, "This field is required")

const optionalString = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined
    if (typeof value === "string") {
      const trimmed = value.trim()
      return trimmed.length === 0 ? undefined : trimmed
    }
    return value
  },
  nonEmptyString.optional(),
)

const userRoleEnum = z.enum([
  "super_admin",
  "admin",
  "teacher",
  "student",
  "parent",
  "librarian",
  "accountant",
])

const userRoleSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase()
  if (!normalized) return normalized
  const canonical = normalized.replace(/\s+/g, "-").replace(/_/g, "-")
  return canonical === "super-admin" ? "super_admin" : canonical
}, userRoleEnum)

const userStatusEnum = z.enum(["active", "inactive", "suspended"])

const userStatusSchema = z.preprocess((value) => {
  if (typeof value !== "string") return value
  const normalized = value.trim().toLowerCase()
  return normalized || value
}, userStatusEnum)

const dateString = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Invalid date format",
  })

const amountSchema = z
  .union([
    z.number(),
    z
      .string()
      .trim()
      .regex(/^[0-9]+(\.[0-9]+)?$/, "Amount must be a number"),
  ])
  .transform((value) => (typeof value === "string" ? Number(value) : value))
  .refine((value) => Number.isFinite(value), {
    message: "Amount must be a valid number",
  })
  .refine((value) => value >= 100, {
    message: "Amount must be at least 100",
  })

export type ValidationErrorMap = Record<string, string[]>

export const userSchema = z.object({
  id: nonEmptyString,
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  role: userRoleEnum,
  status: userStatusEnum,
  createdAt: dateString,
  updatedAt: dateString.optional(),
  studentIds: z.array(nonEmptyString).optional(),
  subjects: z.array(nonEmptyString).optional(),
})

export const userCreateSchema = z.object({
  id: nonEmptyString.optional(),
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email address"),
  role: userRoleSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .optional(),
  status: userStatusSchema.optional(),
  studentIds: z.array(nonEmptyString).optional(),
  subjects: z.array(nonEmptyString).optional(),
})

export const userUpdateSchema = z
  .object({
    id: nonEmptyString,
    name: z.string().trim().min(2, "Name must be at least 2 characters").optional(),
    email: z.string().trim().email("Invalid email address").optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    studentIds: z.array(nonEmptyString).optional(),
    subjects: z.array(nonEmptyString).optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "id"),
    {
      message: "Provide at least one field to update",
      path: ["form"],
    },
  )

export const marksSchema = z.object({
  studentId: nonEmptyString,
  subject: nonEmptyString,
  ca1: z.number().min(0).max(20, "CA1 must be between 0-20"),
  ca2: z.number().min(0).max(20, "CA2 must be between 0-20"),
  assignment: z.number().min(0).max(10, "Assignment must be between 0-10"),
  exam: z.number().min(0).max(50, "Exam must be between 0-50"),
  remarks: z
    .string()
    .trim()
    .max(200, "Remarks must be less than 200 characters"),
  term: z.enum(["First Term", "Second Term", "Third Term"]),
  session: nonEmptyString,
})

export const paymentSchema = z.object({
  studentId: nonEmptyString,
  amount: amountSchema,
  reference: nonEmptyString,
  status: z.enum(["pending", "success", "failed"]),
  paymentMethod: nonEmptyString,
})

export const classCreateSchema = z.object({
  id: nonEmptyString.optional(),
  name: nonEmptyString,
  level: nonEmptyString,
  capacity: z
    .union([z.number(), z.string().trim().regex(/^[0-9]+$/, "Capacity must be a number")])
    .transform((value) => (typeof value === "string" ? Number(value) : value))
    .refine((value) => value > 0, { message: "Capacity must be positive" })
    .optional(),
  classTeacherId: optionalString,
  subjects: z.array(nonEmptyString).optional(),
  status: z.enum(["active", "inactive"]).optional(),
})

export const classUpdateSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString.optional(),
    level: nonEmptyString.optional(),
    capacity: z
      .union([z.number(), z.string().trim().regex(/^[0-9]+$/, "Capacity must be a number")])
      .transform((value) => (typeof value === "string" ? Number(value) : value))
      .refine((value) => value > 0, { message: "Capacity must be positive" })
      .optional(),
    classTeacherId: optionalString,
    subjects: z.array(nonEmptyString).optional(),
    status: z.enum(["active", "inactive"]).optional(),
  })
  .refine(
    (value) => Object.keys(value).some((key) => key !== "id"),
    {
      message: "Provide at least one field to update",
      path: ["form"],
    },
  )

export const assignmentCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(10, "Description must be at least 10 characters"),
  subject: z.string().trim().min(1, "Subject is required"),
  classId: nonEmptyString,
  teacherId: nonEmptyString,
  dueDate: dateString,
  status: z.enum(["active", "closed"]).optional(),
})

export const assignmentSubmissionSchema = z.object({
  type: z.literal("submission"),
  assignmentId: nonEmptyString,
  studentId: nonEmptyString,
  files: z.array(nonEmptyString).optional(),
})

export const paymentInitializeSchema = z.object({
  studentId: nonEmptyString,
  amount: amountSchema,
  email: z.string().trim().email("Invalid email address").optional(),
  callbackUrl: z.string().trim().url("Invalid callback URL").optional(),
})

export const paymentVerifySchema = z
  .object({
    reference: z.string().trim().min(1, "Reference is required").optional(),
    id: z.string().trim().min(1, "Payment ID is required").optional(),
  })
  .refine((value) => Boolean(value.reference || value.id), {
    message: "Provide a payment reference or id",
    path: ["reference"],
  })

export const classSchema = classCreateSchema

export const assignmentSchema = assignmentCreateSchema

export function formatZodErrors(error: ZodError): ValidationErrorMap {
  return error.issues.reduce<ValidationErrorMap>((accumulator, issue) => {
    const path = issue.path.length ? issue.path.join(".") : "form"
    if (!accumulator[path]) {
      accumulator[path] = []
    }
    accumulator[path].push(issue.message)
    return accumulator
  }, {})
}
