CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'PARENT', 'ACCOUNTANT', 'LIBRARIAN', 'STUDENT');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ClassStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'CLOSED');
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED');
CREATE TYPE "StudentPaymentStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE');
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "passwordHash" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE "Class" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "level" TEXT,
  "section" TEXT,
  "capacity" INTEGER,
  "status" "ClassStatus" NOT NULL DEFAULT 'ACTIVE',
  "subjects" JSONB,
  "teacherId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Student" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "classId" TEXT,
  "section" TEXT,
  "admissionNumber" TEXT NOT NULL UNIQUE,
  "parentName" TEXT,
  "parentEmail" TEXT,
  "paymentStatus" "StudentPaymentStatus" NOT NULL DEFAULT 'PENDING',
  "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
  "dateOfBirth" TIMESTAMP WITH TIME ZONE,
  "address" TEXT,
  "phone" TEXT,
  "guardianPhone" TEXT,
  "bloodGroup" TEXT,
  "admissionDate" TIMESTAMP WITH TIME ZONE,
  "subjects" JSONB,
  "attendance" JSONB,
  "grades" JSONB,
  "photoUrl" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Assignment" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL,
  "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Assignment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "AssignmentSubmission" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "assignmentId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "files" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "submittedAt" TIMESTAMP WITH TIME ZONE,
  "grade" TEXT,
  "feedback" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "AssignmentSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssignmentSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Payment" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "studentId" TEXT NOT NULL,
  "amount" NUMERIC(12,2) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "method" TEXT NOT NULL,
  "reference" TEXT NOT NULL UNIQUE,
  "term" TEXT NOT NULL,
  "description" TEXT,
  "paidAt" TIMESTAMP WITH TIME ZONE,
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Payment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Receipt" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "paymentId" TEXT NOT NULL,
  "issuedTo" TEXT NOT NULL,
  "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "amount" NUMERIC(12,2) NOT NULL,
  "items" JSONB NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "Receipt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");
CREATE INDEX "Student_classId_idx" ON "Student"("classId");
CREATE INDEX "Student_userId_idx" ON "Student"("userId");
CREATE INDEX "Assignment_classId_idx" ON "Assignment"("classId");
CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");
CREATE INDEX "Payment_studentId_idx" ON "Payment"("studentId");
CREATE INDEX "Receipt_paymentId_idx" ON "Receipt"("paymentId");
CREATE INDEX "AuditLog_entity_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
