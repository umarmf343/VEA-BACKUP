"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { GraduationCap, Users, Shield, BookOpen, DollarSign, Book, UserCheck, Key } from "lucide-react"
import { PaymentModal } from "@/components/payment-modal"
import { StudentProfileCard } from "@/components/student-profile-card"
import { AcademicProgress } from "@/components/academic-progress"
import { AttendanceTracker } from "@/components/attendance-tracker"
import { SystemOverview } from "@/components/admin/system-overview"
import { StudentManagement } from "@/components/admin/student-management"
import { PaymentManagement } from "@/components/admin/payment-management"
import { TeacherDashboard } from "@/components/teacher-dashboard"
import { StudentDashboard } from "@/components/student-dashboard"
import { LibrarianDashboard } from "@/components/librarian-dashboard"
import { AccountantDashboard } from "@/components/accountant-dashboard"
import TimetableManagement from "@/components/timetable-management"
import ExamManagement from "@/components/exam-management"
import GradeManagement from "@/components/grade-management"
import SuperAdminDashboard from "@/components/super-admin-dashboard"
import { ReportCardConfig } from "@/components/admin/report-card-config"
import { Noticeboard } from "@/components/noticeboard"
import { UserManagement } from "@/components/admin/user-management"
import { ClassSubjectManagement } from "@/components/admin/class-subject-management"
import { SystemSettings } from "@/components/admin/system-settings"
import { CumulativeReportTrigger } from "@/components/cumulative-report"
import { SystemHealthMonitor } from "@/components/system-health-monitor"
import { NotificationCenter } from "@/components/notification-center"
import { ReportCardViewer } from "@/components/report-card-viewer"
import { AutomaticPromotionSystem } from "@/components/automatic-promotion-system"
import { getStudentReportCardData } from "@/lib/report-card-data"
import { InternalMessaging } from "@/components/internal-messaging"
import { AdminApprovalDashboard } from "@/components/admin-approval-dashboard"
import { getCompleteReportCard } from "@/lib/sample-report-data"
import { safeStorage } from "@/lib/safe-storage"
import { cn } from "@/lib/utils"
import type { Viewport } from "next"

export const dynamic = "force-dynamic"
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

type UserRole = "super-admin" | "admin" | "teacher" | "student" | "parent" | "librarian" | "accountant"

interface User {
  id: string
  email: string
  role: UserRole
  name: string
  hasAccess?: boolean
}

export default function HomePage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loginForm, setLoginForm] = useState({ email: "", password: "", role: "parent" as UserRole })
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "parent" as UserRole,
    studentId: "",
  })
  const [registrationEnabled, setRegistrationEnabled] = useState(true)

  useEffect(() => {
    const adminSetting = safeStorage.getItem("registrationEnabled")
    if (adminSetting !== null) {
      setRegistrationEnabled(JSON.parse(adminSetting))
    }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    const mockUser: User = {
      id: "1",
      email: loginForm.email,
      role: loginForm.role,
      name: loginForm.email.split("@")[0],
      hasAccess: loginForm.role === "admin" || loginForm.role === "super-admin" || Math.random() > 0.5,
    }
    setCurrentUser(mockUser)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    const mockUser: User = {
      id: "2",
      email: registerForm.email,
      role: registerForm.role,
      name: registerForm.name,
      hasAccess: registerForm.role === "admin" || registerForm.role === "super-admin",
    }
    setCurrentUser(mockUser)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  if (currentUser) {
    return <Dashboard user={currentUser} onLogout={handleLogout} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-blue-900 mb-2">VEA 2025</h1>
          <p className="text-blue-700">School Management Portal</p>
        </div>

        <Card className="border-blue-200 bg-white/95 backdrop-blur shadow-xl">
          <CardHeader>
            <CardTitle className="text-blue-900">Welcome Back</CardTitle>
            <CardDescription className="text-blue-600">Sign in to access your school portal</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className={cn("grid w-full bg-blue-50", registrationEnabled ? "grid-cols-2" : "grid-cols-1")}>
                <TabsTrigger value="login" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Login
                </TabsTrigger>
                {registrationEnabled && (
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                  >
                    Register
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-role" className="text-blue-900">
                      Role
                    </Label>
                    <Select
                      value={loginForm.role}
                      onValueChange={(value: UserRole) => setLoginForm((prev) => ({ ...prev, role: value }))}
                    >
                      <SelectTrigger className="border-blue-200 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="super-admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Super Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="teacher">
                          <div className="flex items-center gap-2">
                            <UserCheck className="h-4 w-4" />
                            Teacher
                          </div>
                        </SelectItem>
                        <SelectItem value="student">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Student
                          </div>
                        </SelectItem>
                        <SelectItem value="parent">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Parent
                          </div>
                        </SelectItem>
                        <SelectItem value="librarian">
                          <div className="flex items-center gap-2">
                            <Book className="h-4 w-4" />
                            Librarian
                          </div>
                        </SelectItem>
                        <SelectItem value="accountant">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Accountant
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-blue-900">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="border-blue-200 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-blue-900">
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="border-blue-200 focus:border-blue-500"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    Sign In
                  </Button>
                </form>
              </TabsContent>

              {registrationEnabled && (
                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-role" className="text-blue-900">
                        Role
                      </Label>
                      <Select
                        value={registerForm.role}
                        onValueChange={(value: UserRole) => setRegisterForm((prev) => ({ ...prev, role: value }))}
                      >
                        <SelectTrigger className="border-blue-200 focus:border-blue-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teacher">
                            <div className="flex items-center gap-2">
                              <UserCheck className="h-4 w-4" />
                              Teacher
                            </div>
                          </SelectItem>
                          <SelectItem value="student">
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4" />
                              Student
                            </div>
                          </SelectItem>
                          <SelectItem value="parent">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Parent
                            </div>
                          </SelectItem>
                          <SelectItem value="librarian">
                            <div className="flex items-center gap-2">
                              <Book className="h-4 w-4" />
                              Librarian
                            </div>
                          </SelectItem>
                          <SelectItem value="accountant">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Accountant
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-name" className="text-blue-900">
                        Full Name
                      </Label>
                      <Input
                        id="register-name"
                        placeholder="Enter your full name"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email" className="text-blue-900">
                        Email
                      </Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="Enter your email"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>
                    {registerForm.role === "parent" && (
                      <div className="space-y-2">
                        <Label htmlFor="student-id" className="text-blue-900">
                          Student ID
                        </Label>
                        <Input
                          id="student-id"
                          placeholder="Enter your child's student ID"
                          value={registerForm.studentId}
                          onChange={(e) => setRegisterForm((prev) => ({ ...prev, studentId: e.target.value }))}
                          className="border-blue-200 focus:border-blue-500"
                          required
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="register-password" className="text-blue-900">
                        Password
                      </Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="Create a password"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="border-blue-200 focus:border-blue-500"
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white">
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-center gap-4">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-white/80 border-blue-200 text-blue-700 hover:bg-white hover:text-blue-800"
          >
            <a href="https://victoryeducationalacademy.com.ng/" target="_blank" rel="noopener noreferrer">
              HOME
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="bg-white/80 border-blue-200 text-blue-700 hover:bg-white hover:text-blue-800"
          >
            <a href="https://victoryeducationalacademy.com.ng/contact" target="_blank" rel="noopener noreferrer">
              CONTACT US
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case "super-admin":
        return "Super Admin"
      case "admin":
        return "Admin"
      case "teacher":
        return "Teacher"
      case "student":
        return "Student"
      case "parent":
        return "Parent"
      case "librarian":
        return "Librarian"
      case "accountant":
        return "Accountant"
      default:
        return role
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px:6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-orange-400" />
              <div>
                <h1 className="text-xl font-bold">VEA 2025</h1>
                <p className="text-sm text-blue-200">{getRoleDisplayName(user.role)} Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">Welcome, {user.name}</span>
              <Button
                onClick={onLogout}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px:6 lg:px-8 py-8">
        {user.role === "super-admin" && <SuperAdminDashboard />}
        {user.role === "admin" && <AdminDashboard />}
        {user.role === "parent" && <ParentDashboard user={user} />}
        {user.role === "student" && (
          <StudentDashboard
            student={{
              id: user.id,
              name: user.name,
              email: user.email,
              class: "JSS 2A",
              admissionNumber: "VEA2025001",
            }}
          />
        )}
        {user.role === "teacher" && (
          <TeacherDashboard
            teacher={{
              id: user.id,
              name: user.name,
              email: user.email,
              subjects: ["Mathematics", "Physics"],
              classes: ["JSS 1A", "JSS 2B"],
            }}
          />
        )}
        {user.role === "librarian" && (
          <LibrarianDashboard
            librarian={{
              id: user.id,
              name: user.name,
              email: user.email,
            }}
          />
        )}
        {user.role === "accountant" && (
          <AccountantDashboard
            accountant={{
              id: user.id,
              name: user.name,
              email: user.email,
            }}
          />
        )}
      </main>
    </div>
  )
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-900">Admin Dashboard</h2>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-15 bg-blue-50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Overview
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Settings
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Users
          </TabsTrigger>
          <TabsTrigger value="classes" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Classes
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Students
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Payments
          </TabsTrigger>
          <TabsTrigger value="timetable" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Timetable
          </TabsTrigger>
          <TabsTrigger value="exams" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Exams
          </TabsTrigger>
          <TabsTrigger value="grades" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Grades
          </TabsTrigger>
          <TabsTrigger value="reportcards" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Report Cards
          </TabsTrigger>
          <TabsTrigger value="approval" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Report Approval
          </TabsTrigger>
          <TabsTrigger value="promotion" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Promotion
          </TabsTrigger>
          <TabsTrigger value="noticeboard" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Noticeboard
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="messages" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <SystemOverview />
            </div>
            <div>
              <NotificationCenter userRole="admin" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement />
        </TabsContent>

        <TabsContent value="classes" className="space-y-6">
          <ClassSubjectManagement />
        </TabsContent>

        <TabsContent value="students" className="space-y-6">
          <StudentManagement />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentManagement />
        </TabsContent>

        <TabsContent value="timetable" className="space-y-6">
          <TimetableManagement />
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <ExamManagement />
        </TabsContent>

        <TabsContent value="grades" className="space-y-6">
          <GradeManagement />
        </TabsContent>

        <TabsContent value="reportcards" className="space-y-6">
          <ReportCardConfig />
        </TabsContent>

        <TabsContent value="approval" className="space-y-6">
          <AdminApprovalDashboard />
        </TabsContent>

        <TabsContent value="promotion" className="space-y-6">
          <AutomaticPromotionSystem />
        </TabsContent>

        <TabsContent value="noticeboard" className="space-y-6">
          <Noticeboard userRole="admin" userName="Admin" />
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <SystemHealthMonitor />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <InternalMessaging currentUser={{ id: "admin", name: "Admin", role: "admin" }} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ParentDashboard({ user }: { user: User }) {
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [hasAccess, setHasAccess] = useState(user.hasAccess)
  const [showReportCard, setShowReportCard] = useState(false)
  const [adminGrantedAccess, setAdminGrantedAccess] = useState(false)
  const [reportCardData, setReportCardData] = useState<any>(null)

  useEffect(() => {
    const paymentSuccess = safeStorage.getItem("paymentSuccess")
    const grantedAccess = safeStorage.getItem("grantedAccess")

    let accessGranted = false

    if (paymentSuccess === "true") {
      accessGranted = true
      safeStorage.removeItem("paymentSuccess")
    }

    if (grantedAccess) {
      const accessData = JSON.parse(grantedAccess)
      if (accessData[user.id]) {
        setAdminGrantedAccess(true)
        accessGranted = true
      }
    }

    if (accessGranted) {
      setHasAccess(true)
    }
  }, [user.id])

  const handlePaymentSuccess = () => {
    const grantedAccess = JSON.parse(safeStorage.getItem("grantedAccess") || "{}")
    grantedAccess[user.id] = true
    safeStorage.setItem("grantedAccess", JSON.stringify(grantedAccess))

    setHasAccess(true)
    setShowPaymentModal(false)
  }

  const studentData = {
    id: "1",
    name: "John Doe",
    class: "10",
    section: "A",
    admissionNumber: "VEA2025001",
    dateOfBirth: "2008-05-15",
    address: "123 Main Street, Lagos, Nigeria",
    phone: "+234 801 234 5678",
    email: "john.doe@student.vea.edu.ng",
    status: "active" as const,
  }

  const academicData = {
    subjects: [
      { name: "Mathematics", score: 85, grade: "A", position: 3, totalStudents: 45 },
      { name: "English Language", score: 78, grade: "B+", position: 8, totalStudents: 45 },
      { name: "Physics", score: 92, grade: "A+", position: 1, totalStudents: 45 },
      { name: "Chemistry", score: 80, grade: "B+", position: 5, totalStudents: 45 },
      { name: "Biology", score: 88, grade: "A", position: 2, totalStudents: 45 },
    ],
    overallAverage: 84.6,
    overallGrade: "A",
    classPosition: 4,
    totalStudents: 45,
  }

  const attendanceData = {
    totalDays: 120,
    presentDays: 115,
    absentDays: 3,
    lateArrivals: 2,
    attendancePercentage: 95.8,
    recentAttendance: [
      { date: "2025-01-08", status: "present" as const },
      { date: "2025-01-07", status: "present" as const },
      { date: "2025-01-06", status: "late" as const },
      { date: "2025-01-05", status: "present" as const },
      { date: "2025-01-04", status: "absent" as const },
    ],
  }

  const handleViewReportCard = async () => {
    if (hasAccess) {
      try {
        const approvedReports = JSON.parse(safeStorage.getItem("approvedReports") || "[]")

        if (!approvedReports.includes(studentData.id)) {
          alert("Report card is not yet approved by the administrator. Please wait for approval.")
          return
        }

        const completeData = getCompleteReportCard(
          Number.parseInt(studentData.id),
          "JSS 1A",
          "Mathematics",
          "first",
          "2024/2025",
        )

        if (completeData) {
          setReportCardData(completeData)
          setShowReportCard(true)
          return
        }

        const data = await getStudentReportCardData(studentData.id, "First Term", "2024/2025")

        if (data && data.subjects && data.subjects.length > 0) {
          setReportCardData({
            student: {
              name: data.student.name,
              admissionNumber: data.student.admissionNumber,
              class: data.student.class,
              term: data.student.term,
              session: data.student.session,
              position: data.position,
              totalStudents: academicData.totalStudents,
              photo: "/diverse-students.png",
            },
            subjects: data.subjects,
            summary: {
              totalObtainable: data.totalObtainable,
              totalObtained: data.totalObtained,
              average: data.average,
            },
            affectiveDomain: data.affectiveDomain,
            psychomotorDomain: data.psychomotorDomain,
            remarks: {
              classTeacher: data.classTeacherRemarks,
              headmaster:
                safeStorage.getItem("defaultRemarks") ||
                "An exemplary student who continues to excel in academics and character development.",
            },
            branding: {
              logo: safeStorage.getItem("schoolLogo") || "",
              signature: safeStorage.getItem("headmasterSignature") || "",
              headmasterName: safeStorage.getItem("headmasterName") || "Dr. Victory Adebayo",
            },
            attendance: {
              present: attendanceData.presentDays,
              absent: attendanceData.absentDays,
              total: attendanceData.totalDays,
            },
          })
          setShowReportCard(true)
        } else {
          alert("No report card data available. Please ensure teachers have entered marks for this student.")
        }
      } catch (error) {
        console.error("Error loading report card data:", error)
        alert("Error loading report card data. Please try again later.")
      }
    } else {
      setShowPaymentModal(true)
    }
  }

  const getAccessStatus = () => {
    if (adminGrantedAccess) {
      return {
        type: "admin-granted",
        message: "Access granted by Administrator",
        icon: <Key className="w-4 h-4" />,
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      }
    } else if (hasAccess) {
      return {
        type: "payment-verified",
        message: "Payment verified - Full access granted",
        icon: <DollarSign className="w-4 h-4" />,
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      }
    } else {
      return {
        type: "payment-required",
        message: "Payment required for full access",
        icon: <DollarSign className="w-4 h-4" />,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
      }
    }
  }

  const accessStatus = getAccessStatus()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-blue-900">Parent Dashboard</h2>
        {!hasAccess && (
          <Button className="bg-orange-600 hover:bg-orange-700 text-white" onClick={() => setShowPaymentModal(true)}>
            Pay School Fees
          </Button>
        )}
      </div>

      <Card className={`${accessStatus.borderColor} ${accessStatus.bgColor}`}>
        <CardHeader>
          <CardTitle className={`${accessStatus.color} flex items-center gap-2`}>
            {accessStatus.icon}
            Access Status
          </CardTitle>
          <CardDescription className={accessStatus.color}>{accessStatus.message}</CardDescription>
        </CardHeader>
        {!hasAccess && (
          <CardContent>
            <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => setShowPaymentModal(true)}>
              Pay School Fees - ₦50,000
            </Button>
          </CardContent>
        )}
      </Card>

      {showReportCard ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-blue-900">Student Report Card</h3>
            <Button variant="outline" onClick={() => setShowReportCard(false)}>
              Back to Dashboard
            </Button>
          </div>
          <ReportCardViewer
            studentId={studentData.id}
            studentName={studentData.name}
            userRole="parent"
            hasAccess={hasAccess || false}
            reportCardData={reportCardData}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StudentProfileCard student={studentData} />

            <AcademicProgress
              subjects={academicData.subjects}
              overallAverage={academicData.overallAverage}
              overallGrade={academicData.overallGrade}
              classPosition={academicData.classPosition}
              totalStudents={academicData.totalStudents}
              hasAccess={hasAccess || false}
            />

            <AttendanceTracker attendance={attendanceData} hasAccess={hasAccess || false} />

            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Quick Actions</CardTitle>
                <CardDescription>Common parent portal actions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={handleViewReportCard}
                  disabled={!hasAccess}
                >
                  View Report Card
                </Button>
                <CumulativeReportTrigger hasAccess={hasAccess || false}>
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={!hasAccess}>
                    View Cumulative Report
                  </Button>
                </CumulativeReportTrigger>
                <Button className="w-full bg-transparent" variant="outline">
                  View Payment History
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  Contact Teacher
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  School Calendar
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Noticeboard userRole="parent" userName={user.name} />
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-900">Messages</CardTitle>
                <CardDescription>Communicate with teachers and school administration</CardDescription>
              </CardHeader>
              <CardContent>
                <InternalMessaging currentUser={{ id: user.id, name: user.name, role: "parent" }} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        studentName={studentData.name}
        amount={50000}
      />
    </div>
  )
}
