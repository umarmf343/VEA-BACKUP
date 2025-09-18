const {
  PrismaClient,
  Prisma,
  UserRole,
  UserStatus,
  ClassStatus,
  StudentStatus,
  PaymentStatus,
  AssignmentStatus,
  SubmissionStatus,
  StudentPaymentStatus,
} = require("@prisma/client")

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding core records...")

  const admin = await prisma.user.upsert({
    where: { email: "admin@vea.test" },
    update: {},
    create: {
      email: "admin@vea.test",
      name: "System Administrator",
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      passwordHash: "$2a$10$mockedhashmockedhashmockedhas",
    },
  })

  const teacher = await prisma.user.upsert({
    where: { email: "teacher@vea.test" },
    update: {},
    create: {
      email: "teacher@vea.test",
      name: "Test Teacher",
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
    },
  })

  const parentUser = await prisma.user.upsert({
    where: { email: "parent@vea.test" },
    update: {},
    create: {
      email: "parent@vea.test",
      name: "Parent User",
      role: UserRole.PARENT,
      status: UserStatus.ACTIVE,
    },
  })

  const classRecord = await prisma.class.upsert({
    where: { id: "seed-class" },
    update: {
      teacherId: teacher.id,
    },
    create: {
      id: "seed-class",
      name: "JSS 1",
      level: "Junior Secondary",
      section: "A",
      capacity: 35,
      status: ClassStatus.ACTIVE,
      subjects: [],
      teacherId: teacher.id,
    },
  })

  const student = await prisma.student.upsert({
    where: { admissionNumber: "ADM-001" },
    update: {},
    create: {
      name: "John Doe",
      email: "student@vea.test",
      admissionNumber: "ADM-001",
      classId: classRecord.id,
      section: "A",
      parentName: parentUser.name,
      parentEmail: parentUser.email,
      status: StudentStatus.ACTIVE,
      paymentStatus: StudentPaymentStatus.PAID,
      attendance: { present: 45, total: 48 },
      subjects: ["Mathematics", "English"],
      grades: [],
    },
  })

  const assignment = await prisma.assignment.create({
    data: {
      title: "Intro to Algebra",
      description: "Solve the following equations...",
      subject: "Mathematics",
      classId: classRecord.id,
      teacherId: teacher.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: AssignmentStatus.ACTIVE,
    },
  })

  await prisma.assignmentSubmission.create({
    data: {
      assignmentId: assignment.id,
      studentId: student.id,
      files: ["algebra.pdf"],
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
  })

  const payment = await prisma.payment.create({
    data: {
      studentId: student.id,
      amount: new Prisma.Decimal(55000),
      status: PaymentStatus.PAID,
      method: "bank_transfer",
      reference: "PAY-REF-001",
      term: "2024-Q1",
      description: "Tuition payment",
      paidAt: new Date(),
    },
  })

  await prisma.receipt.create({
    data: {
      paymentId: payment.id,
      issuedTo: student.name,
      amount: payment.amount,
      items: [
        { label: "Tuition", amount: 50000 },
        { label: "Library", amount: 5000 },
      ],
    },
  })

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "SEED",
      entity: "system",
      details: { message: "Initial seed data populated" },
    },
  })

  console.log("Seed complete")
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
