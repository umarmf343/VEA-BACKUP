import { authService } from "../../lib/auth-service"
import { dbManager } from "../../lib/database-manager"

const emailDefaults: Record<string, string> = {
  "superadmin@vea.edu.ng": process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? "SuperAdmin2025!",
  "admin@vea.edu.ng": process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin2025!",
}

const roleDefaults: Record<string, string> = {
  teacher: process.env.DEFAULT_TEACHER_PASSWORD ?? "Teacher2025!",
  parent: process.env.DEFAULT_PARENT_PASSWORD ?? "Parent2025!",
  student: process.env.DEFAULT_STUDENT_PASSWORD ?? "Student2025!",
  librarian: process.env.DEFAULT_LIBRARIAN_PASSWORD ?? "Librarian2025!",
  accountant: process.env.DEFAULT_ACCOUNTANT_PASSWORD ?? "Accountant2025!",
  admin: process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin2025!",
  super_admin: process.env.DEFAULT_SUPER_ADMIN_PASSWORD ?? "SuperAdmin2025!",
}

async function migrate() {
  const users = await dbManager.getAllUsers()
  let migrated = 0

  for (const user of users) {
    const existingHash = user.passwordHash ?? ""
    const needsMigration = !existingHash || existingHash.includes(":") || !existingHash.startsWith("$2")
    if (!needsMigration) {
      continue
    }

    let password = emailDefaults[user.email.toLowerCase()]
    if (!password) {
      try {
        const roleKey = authService.getRoleKey(user.role)
        password = roleDefaults[roleKey] ?? process.env.DEFAULT_USER_PASSWORD ?? "ChangeMe2025!"
      } catch {
        password = process.env.DEFAULT_USER_PASSWORD ?? "ChangeMe2025!"
      }
    }

    await authService.setUserPassword(user.id, password)
    migrated += 1
  }

  console.log(`✅ Migrated ${migrated} user password${migrated === 1 ? "" : "s"} to bcrypt hashes.`)
}

migrate().catch((error) => {
  console.error("❌ Password migration failed:", error)
  process.exit(1)
})
