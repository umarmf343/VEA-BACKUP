"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BookOpen, Users, FileText, GraduationCap, Clock, User, Download, Plus, Edit, Save } from "lucide-react"
import { StudyMaterials } from "@/components/study-materials"
import { Noticeboard } from "@/components/noticeboard"
import { saveTeacherMarks } from "@/lib/report-card-data"
import { InternalMessaging } from "@/components/internal-messaging"
import { safeStorage } from "@/lib/safe-storage"
import React from "react"

interface TeacherDashboardProps {
  teacher: {
    id: string
    name: string
    email: string
    subjects: string[]
    classes: string[]
  }
}

export function TeacherDashboard({ teacher }: TeacherDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showProfile, setShowProfile] = useState(false)
  const [showMarksEntry, setShowMarksEntry] = useState(false)
  const [showCreateAssignment, setShowCreateAssignment] = useState(false)
  const [showSubmissions, setShowSubmissions] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedSubject, setSelectedSubject] = useState("")
  const [selectedTerm, setSelectedTerm] = useState("first")
  const [selectedSession, setSelectedSession] = useState("2024/2025")
  const [reportCardStatus, setReportCardStatus] = useState<
    Record<string, { status: "draft" | "pending" | "approved" | "revoked"; message?: string; submittedDate?: string }>
  >({})
  const [additionalData, setAdditionalData] = useState({
    classPositions: {} as Record<number, number>,
    affectiveDomain: {} as Record<number, { neatness: string; honesty: string; punctuality: string }>,
    psychomotorDomain: {} as Record<number, { sport: string; handwriting: string }>,
    classTeacherRemarks: {} as Record<number, string>,
    attendance: {} as Record<number, { present: number; absent: number; total: number }>,
  })

  const [assignmentForm, setAssignmentForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    subject: "",
    class: "",
    file: null as File | null,
  })

  const mockStudents = [
    { id: 1, name: "John Doe", class: "JSS 1A", subjects: ["Mathematics", "English"] },
    { id: 2, name: "Jane Smith", class: "JSS 1A", subjects: ["Mathematics"] },
    { id: 3, name: "Mike Johnson", class: "JSS 2B", subjects: ["English"] },
  ]

  const mockExams = [
    { id: 1, title: "First Term Mathematics", class: "JSS 1A", date: "2024-03-15", status: "upcoming" },
    { id: 2, title: "Mid-term English", class: "JSS 2B", date: "2024-03-10", status: "completed" },
  ]

  const mockTimetable = [
    { day: "Monday", time: "8:00-9:00", subject: "Mathematics", class: "JSS 1A" },
    { day: "Monday", time: "10:00-11:00", subject: "English", class: "JSS 2B" },
    { day: "Tuesday", time: "9:00-10:00", subject: "Mathematics", class: "JSS 1A" },
  ]

  const [marksData, setMarksData] = useState([
    {
      studentId: 1,
      studentName: "John Doe",
      firstCA: 15,
      secondCA: 12,
      noteAssignment: 8,
      caTotal: 35,
      exam: 55,
      grandTotal: 90,
      totalMarksObtainable: 100,
      totalMarksObtained: 90,
      averageScore: 90,
      position: 1,
      grade: "A",
      teacherRemark: "Excellent performance",
    },
    {
      studentId: 2,
      studentName: "Jane Smith",
      firstCA: 14,
      secondCA: 11,
      noteAssignment: 5,
      caTotal: 30,
      exam: 45,
      grandTotal: 75,
      totalMarksObtainable: 100,
      totalMarksObtained: 75,
      averageScore: 75,
      position: 2,
      grade: "B",
      teacherRemark: "Good work",
    },
    {
      studentId: 3,
      studentName: "Mike Johnson",
      firstCA: 12,
      secondCA: 8,
      noteAssignment: 5,
      caTotal: 25,
      exam: 40,
      grandTotal: 65,
      totalMarksObtainable: 100,
      totalMarksObtained: 65,
      averageScore: 65,
      position: 3,
      grade: "C",
      teacherRemark: "Needs improvement",
    },
  ])

  const calculatePositionsAndAverages = (data: any[]) => {
    // Sort by grand total descending to determine positions
    const sorted = [...data].sort((a, b) => b.grandTotal - a.grandTotal)

    return data.map((student) => {
      const position = sorted.findIndex((s) => s.studentId === student.studentId) + 1
      const averageScore =
        student.totalMarksObtained > 0
          ? Math.round((student.totalMarksObtained / student.totalMarksObtainable) * 100)
          : 0

      return {
        ...student,
        position,
        averageScore,
        totalMarksObtained: student.grandTotal, // Update obtained marks to match grand total
      }
    })
  }

  const mockAssignments = [
    {
      id: 1,
      title: "Quadratic Equations",
      subject: "Mathematics",
      class: "JSS 1A",
      dueDate: "2024-03-20",
      submissions: 15,
      totalStudents: 20,
    },
    {
      id: 2,
      title: "Essay Writing",
      subject: "English",
      class: "JSS 2B",
      dueDate: "2024-03-18",
      submissions: 18,
      totalStudents: 22,
    },
  ]

  const mockMaterials = [
    {
      id: 1,
      title: "Mathematics Formulas",
      subject: "Mathematics",
      uploadDate: "2024-03-01",
      downloads: 45,
    },
    {
      id: 2,
      title: "Grammar Rules",
      subject: "English",
      uploadDate: "2024-02-28",
      downloads: 32,
    },
  ]

  const mockSubmissions = [
    {
      id: 1,
      studentName: "John Doe",
      submissionDate: "2024-03-18",
      status: "submitted",
      file: "john_quadratic_equations.pdf",
      grade: null,
    },
    {
      id: 2,
      studentName: "Jane Smith",
      submissionDate: "2024-03-19",
      status: "submitted",
      file: "jane_quadratic_equations.pdf",
      grade: null,
    },
    {
      id: 3,
      studentName: "Mike Johnson",
      submissionDate: null,
      status: "pending",
      file: null,
      grade: null,
    },
  ]

  const calculateGrade = (total: number) => {
    if (total >= 75) return "A"
    if (total >= 65) return "B"
    if (total >= 55) return "C"
    if (total >= 45) return "D"
    return "F"
  }

  const handleMarksUpdate = (studentId: number, field: string, value: any) => {
    setMarksData((prev) => {
      const updated = prev.map((student) => {
        if (student.studentId === studentId) {
          const updatedStudent = { ...student, [field]: value }

          // Auto-calculate totals when individual scores change
          if (field === "firstCA" || field === "secondCA" || field === "noteAssignment") {
            updatedStudent.caTotal =
              (updatedStudent.firstCA || 0) + (updatedStudent.secondCA || 0) + (updatedStudent.noteAssignment || 0)
            updatedStudent.grandTotal = updatedStudent.caTotal + (updatedStudent.exam || 0)
            updatedStudent.grade = calculateGrade(updatedStudent.grandTotal)
            updatedStudent.totalMarksObtained = updatedStudent.grandTotal
          } else if (field === "exam") {
            updatedStudent.grandTotal = (updatedStudent.caTotal || 0) + (updatedStudent.exam || 0)
            updatedStudent.grade = calculateGrade(updatedStudent.grandTotal)
            updatedStudent.totalMarksObtained = updatedStudent.grandTotal
          } else if (field === "totalMarksObtainable") {
            updatedStudent.averageScore =
              updatedStudent.totalMarksObtained > 0
                ? Math.round((student.totalMarksObtained / student.totalMarksObtainable) * 100)
                : 0
          }

          return updatedStudent
        }
        return student
      })

      return calculatePositionsAndAverages(updated)
    })
  }

  const getReportCardKey = () => `${selectedClass}-${selectedSubject}-${selectedTerm}-${selectedSession}`

  const handleSendForApproval = () => {
    const key = getReportCardKey()
    const newStatus = {
      ...reportCardStatus,
      [key]: {
        status: "pending",
        submittedDate: new Date().toLocaleDateString(),
      },
    }
    setReportCardStatus(newStatus)

    safeStorage.setItem("reportCardStatus", JSON.stringify(newStatus))

    alert("Report card sent for admin approval!")
  }

  const getCurrentStatus = () => {
    const key = getReportCardKey()
    return reportCardStatus[key] || { status: "draft" }
  }

  React.useEffect(() => {
    const savedStatus = safeStorage.getItem("reportCardStatus")
    if (savedStatus) {
      setReportCardStatus(JSON.parse(savedStatus))
    }
  }, [])

  const handleSaveMarks = async () => {
    try {
      const result = await saveTeacherMarks({
        class: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        session: selectedSession,
        marks: marksData.map((student) => ({
          studentId: student.studentId,
          studentName: student.studentName,
          firstCA: student.firstCA,
          secondCA: student.secondCA,
          noteAssignment: student.noteAssignment,
          exam: student.exam,
          teacherRemark: student.teacherRemark,
        })),
        teacherId: teacher.id,
      })

      if (result.success) {
        const key = getReportCardKey()
        const newStatus = { ...reportCardStatus }
        newStatus[key] = { status: "draft" }
        setReportCardStatus(newStatus)
        safeStorage.setItem("reportCardStatus", JSON.stringify(newStatus))

        alert("Marks saved successfully and will appear on student report cards!")
        setShowMarksEntry(false)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error("Error saving marks:", error)
      alert("Error saving marks. Please try again.")
    }
  }

  const handleCreateAssignment = () => {
    // In real implementation, this would save to database
    setShowCreateAssignment(false)
    setAssignmentForm({
      title: "",
      description: "",
      dueDate: "",
      subject: "",
      class: "",
      file: null,
    })
  }

  const handleViewSubmissions = (assignment: any) => {
    setSelectedAssignment(assignment)
    setShowSubmissions(true)
  }

  const handleSaveBehavioralAssessment = async () => {
    try {
      const key = getReportCardKey()
      const behavioralData = {
        class: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        session: selectedSession,
        affectiveDomain: additionalData.affectiveDomain,
        psychomotorDomain: additionalData.psychomotorDomain,
        teacherId: teacher.id,
        timestamp: new Date().toISOString(),
      }

      // Save to localStorage (simulating database)
      const existingData = JSON.parse(safeStorage.getItem("behavioralAssessments") || "{}")
      existingData[key] = behavioralData
      safeStorage.setItem("behavioralAssessments", JSON.stringify(existingData))

      alert("Behavioral assessment saved successfully!")
    } catch (error) {
      console.error("Error saving behavioral assessment:", error)
      alert("Failed to save behavioral assessment")
    }
  }

  const handleSaveAttendancePosition = async () => {
    try {
      const key = getReportCardKey()
      const attendanceData = {
        class: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        session: selectedSession,
        classPositions: additionalData.classPositions,
        attendance: additionalData.attendance,
        teacherId: teacher.id,
        timestamp: new Date().toISOString(),
      }

      // Save to localStorage (simulating database)
      const existingData = JSON.parse(safeStorage.getItem("attendancePositions") || "{}")
      existingData[key] = attendanceData
      safeStorage.setItem("attendancePositions", JSON.stringify(existingData))

      alert("Attendance and position data saved successfully!")
    } catch (error) {
      console.error("Error saving attendance/position:", error)
      alert("Failed to save attendance and position data")
    }
  }

  const handleSaveClassTeacherRemarks = async () => {
    try {
      const key = getReportCardKey()
      const remarksData = {
        class: selectedClass,
        subject: selectedSubject,
        term: selectedTerm,
        session: selectedSession,
        classTeacherRemarks: additionalData.classTeacherRemarks,
        teacherId: teacher.id,
        timestamp: new Date().toISOString(),
      }

      // Save to localStorage (simulating database)
      const existingData = JSON.parse(safeStorage.getItem("classTeacherRemarks") || "{}")
      existingData[key] = remarksData
      safeStorage.setItem("classTeacherRemarks", JSON.stringify(existingData))

      alert("Class teacher remarks saved successfully!")
    } catch (error) {
      console.error("Error saving class teacher remarks:", error)
      alert("Failed to save class teacher remarks")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2d682d] to-[#b29032] text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Welcome, {teacher.name}</h1>
        <p className="text-green-100">
          Subject: {teacher.subject} | Class: {teacher.class}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{mockStudents.length}</p>
                <p className="text-sm text-gray-600">Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{teacher.subjects.length}</p>
                <p className="text-sm text-gray-600">Subjects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{teacher.classes.length}</p>
                <p className="text-sm text-gray-600">Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{mockExams.length}</p>
                <p className="text-sm text-gray-600">Exams</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="marks">Enter Marks</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="noticeboard">Noticeboard</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">My Classes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {teacher.classes.map((className, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>{className}</span>
                      <Badge variant="outline">{teacher.subjects[index] || "Multiple"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Upcoming Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {mockExams
                    .filter((exam) => exam.status === "upcoming")
                    .map((exam) => (
                      <div key={exam.id} className="p-2 bg-yellow-50 border-l-4 border-[#b29032] rounded">
                        <p className="font-medium">{exam.title}</p>
                        <p className="text-sm text-gray-600">
                          {exam.class} - {exam.date}
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Profile tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">My Profile</CardTitle>
              <CardDescription>View your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-[#2d682d] rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">{teacher.name}</h3>
                    <p className="text-gray-600">{teacher.email}</p>
                    <p className="text-sm text-gray-500">Teacher ID: TCH{teacher.id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Subjects</label>
                    <div className="flex gap-1 mt-1">
                      {teacher.subjects.map((subject, index) => (
                        <Badge key={index} variant="secondary">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Classes</label>
                    <div className="flex gap-1 mt-1">
                      {teacher.classes.map((className, index) => (
                        <Badge key={index} variant="outline">
                          {className}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Enter Student Marks & Report Card Details</CardTitle>
              <CardDescription>Enter comprehensive assessment data that will appear on report cards</CardDescription>
              {selectedClass && selectedSubject && (
                <div className="mt-2">
                  <Badge
                    variant={
                      getCurrentStatus().status === "approved"
                        ? "default"
                        : getCurrentStatus().status === "pending"
                          ? "secondary"
                          : getCurrentStatus().status === "revoked"
                            ? "destructive"
                            : "outline"
                    }
                    className="text-sm"
                  >
                    Status: {getCurrentStatus().status.charAt(0).toUpperCase() + getCurrentStatus().status.slice(1)}
                  </Badge>
                  {getCurrentStatus().status === "revoked" && getCurrentStatus().message && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700 font-medium">Admin Feedback:</p>
                      <p className="text-sm text-red-600">{getCurrentStatus().message}</p>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Selection Controls */}
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacher.classes.map((className) => (
                          <SelectItem key={className} value={className}>
                            {className}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subject</Label>
                    <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {teacher.subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Term</Label>
                    <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first">First Term</SelectItem>
                        <SelectItem value="second">Second Term</SelectItem>
                        <SelectItem value="third">Third Term</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Session</Label>
                    <Select value={selectedSession} onValueChange={setSelectedSession}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2024/2025">2024/2025</SelectItem>
                        <SelectItem value="2023/2024">2023/2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Tabs defaultValue="academic" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="academic">Academic Marks</TabsTrigger>
                    <TabsTrigger value="behavioral">Behavioral Assessment</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance & Position</TabsTrigger>
                    <TabsTrigger value="remarks">Class Teacher Remarks</TabsTrigger>
                  </TabsList>

                  <TabsContent value="academic" className="space-y-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-2 grid grid-cols-12 gap-2 font-medium text-xs">
                        <div>Student Name</div>
                        <div>1st C.A. (15)</div>
                        <div>2nd C.A. (15)</div>
                        <div>NOTE/ASSIGN (10)</div>
                        <div>C.A. TOTAL (40)</div>
                        <div>EXAM (60)</div>
                        <div>GRAND TOTAL (100)</div>
                        <div>Total Obtainable</div>
                        <div>Total Obtained</div>
                        <div>Average %</div>
                        <div>Position</div>
                        <div>GRADE</div>
                        <div>Subject Remarks</div>
                      </div>
                      {marksData.map((student) => (
                        <div key={student.studentId} className="p-2 grid grid-cols-12 gap-2 items-center border-t">
                          <div className="font-medium text-sm">{student.studentName}</div>
                          <div>
                            <Input
                              type="number"
                              max="15"
                              value={student.firstCA}
                              onChange={(e) =>
                                handleMarksUpdate(student.studentId, "firstCA", Number.parseInt(e.target.value) || 0)
                              }
                              className="w-14 h-8 text-xs"
                              disabled={
                                getCurrentStatus().status === "pending" || getCurrentStatus().status === "approved"
                              }
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              max="15"
                              value={student.secondCA}
                              onChange={(e) =>
                                handleMarksUpdate(student.studentId, "secondCA", Number.parseInt(e.target.value) || 0)
                              }
                              className="w-14 h-8 text-xs"
                              disabled={
                                getCurrentStatus().status === "pending" || getCurrentStatus().status === "approved"
                              }
                            />
                          </div>
                          <div>
                            <Input
                              type="number"
                              max="10"
                              value={student.noteAssignment}
                              onChange={(e) =>
                                handleMarksUpdate(
                                  student.studentId,
                                  "noteAssignment",
                                  Number.parseInt(e.target.value) || 0,
                                )
                              }
                              className="w-14 h-8 text-xs"
                              disabled={
                                getCurrentStatus().status === "pending" || getCurrentStatus().status === "approved"
                              }
                            />
                          </div>
                          <div className="font-bold text-[#2d682d] text-sm">{student.caTotal}</div>
                          <div>
                            <Input
                              type="number"
                              max="60"
                              value={student.exam}
                              onChange={(e) =>
                                handleMarksUpdate(student.studentId, "exam", Number.parseInt(e.target.value) || 0)
                              }
                              className="w-14 h-8 text-xs"
                              disabled={
                                getCurrentStatus().status === "pending" || getCurrentStatus().status === "approved"
                              }
                            />
                          </div>
                          <div className="font-bold text-[#b29032] text-sm">{student.grandTotal}</div>
                          <div>
                            <Input
                              type="number"
                              value={student.totalMarksObtainable}
                              onChange={(e) =>
                                handleMarksUpdate(
                                  student.studentId,
                                  "totalMarksObtainable",
                                  Number.parseInt(e.target.value) || 100,
                                )
                              }
                              className="w-16 h-8 text-xs"
                              disabled={
                                getCurrentStatus().status === "pending" || getCurrentStatus().status === "approved"
                              }
                            />
                          </div>
                          <div className="font-bold text-blue-600 text-sm">{student.totalMarksObtained}</div>
                          <div className="font-bold text-purple-600 text-sm">{student.averageScore}%</div>
                          <div className="font-bold text-orange-600 text-sm">#{student.position}</div>
                          <div>
                            <Badge
                              variant={
                                student.grade === "A" ? "default" : student.grade === "F" ? "destructive" : "secondary"
                              }
                              className="text-xs"
                            >
                              {student.grade}
                            </Badge>
                          </div>
                          <div>
                            <Input
                              value={student.teacherRemark}
                              onChange={(e) => handleMarksUpdate(student.studentId, "teacherRemark", e.target.value)}
                              className="w-24 h-8 text-xs"
                              placeholder="Subject remark"
                              disabled={
                                getCurrentStatus().status === "pending" || getCurrentStatus().status === "approved"
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-600">Class Average</div>
                          <div className="text-2xl font-bold text-[#2d682d]">
                            {Math.round(
                              marksData.reduce((sum, student) => sum + student.averageScore, 0) / marksData.length,
                            )}
                            %
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-600">Highest Score</div>
                          <div className="text-2xl font-bold text-[#b29032]">
                            {Math.max(...marksData.map((s) => s.grandTotal))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-600">Lowest Score</div>
                          <div className="text-2xl font-bold text-red-600">
                            {Math.min(...marksData.map((s) => s.grandTotal))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm font-medium text-gray-600">Pass Rate</div>
                          <div className="text-2xl font-bold text-green-600">
                            {Math.round((marksData.filter((s) => s.grade !== "F").length / marksData.length) * 100)}%
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent value="behavioral" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Affective Domain Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {marksData.map((student) => (
                            <div key={student.studentId} className="mb-4 p-3 border rounded-lg">
                              <h4 className="font-medium mb-3">{student.studentName}</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <Label className="text-xs">Neatness</Label>
                                  <Select
                                    value={additionalData.affectiveDomain[student.studentId]?.neatness || ""}
                                    onValueChange={(value) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        affectiveDomain: {
                                          ...prev.affectiveDomain,
                                          [student.studentId]: {
                                            ...prev.affectiveDomain[student.studentId],
                                            neatness: value,
                                          },
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="excel">Excel.</SelectItem>
                                      <SelectItem value="vgood">V.Good</SelectItem>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="poor">Poor</SelectItem>
                                      <SelectItem value="vpoor">V.Poor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Honesty</Label>
                                  <Select
                                    value={additionalData.affectiveDomain[student.studentId]?.honesty || ""}
                                    onValueChange={(value) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        affectiveDomain: {
                                          ...prev.affectiveDomain,
                                          [student.studentId]: {
                                            ...prev.affectiveDomain[student.studentId],
                                            honesty: value,
                                          },
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="excel">Excel.</SelectItem>
                                      <SelectItem value="vgood">V.Good</SelectItem>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="poor">Poor</SelectItem>
                                      <SelectItem value="vpoor">V.Poor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Punctuality</Label>
                                  <Select
                                    value={additionalData.affectiveDomain[student.studentId]?.punctuality || ""}
                                    onValueChange={(value) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        affectiveDomain: {
                                          ...prev.affectiveDomain,
                                          [student.studentId]: {
                                            ...prev.affectiveDomain[student.studentId],
                                            punctuality: value,
                                          },
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="excel">Excel.</SelectItem>
                                      <SelectItem value="vgood">V.Good</SelectItem>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="poor">Poor</SelectItem>
                                      <SelectItem value="vpoor">V.Poor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Psychomotor Domain Assessment</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {marksData.map((student) => (
                            <div key={student.studentId} className="mb-4 p-3 border rounded-lg">
                              <h4 className="font-medium mb-3">{student.studentName}</h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-xs">Sport</Label>
                                  <Select
                                    value={additionalData.psychomotorDomain[student.studentId]?.sport || ""}
                                    onValueChange={(value) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        psychomotorDomain: {
                                          ...prev.psychomotorDomain,
                                          [student.studentId]: {
                                            ...prev.psychomotorDomain[student.studentId],
                                            sport: value,
                                          },
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="excel">Excel.</SelectItem>
                                      <SelectItem value="vgood">V.Good</SelectItem>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="poor">Poor</SelectItem>
                                      <SelectItem value="vpoor">V.Poor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Handwriting</Label>
                                  <Select
                                    value={additionalData.psychomotorDomain[student.studentId]?.handwriting || ""}
                                    onValueChange={(value) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        psychomotorDomain: {
                                          ...prev.psychomotorDomain,
                                          [student.studentId]: {
                                            ...prev.psychomotorDomain[student.studentId],
                                            handwriting: value,
                                          },
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue placeholder="Rate" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="excel">Excel.</SelectItem>
                                      <SelectItem value="vgood">V.Good</SelectItem>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="poor">Poor</SelectItem>
                                      <SelectItem value="vpoor">V.Poor</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                    <div className="flex justify-end mt-6">
                      <Button
                        onClick={handleSaveBehavioralAssessment}
                        className="bg-[#2d682d] hover:bg-[#1f4a1f] text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Behavioral Assessment
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="attendance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Class Position</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {marksData.map((student) => (
                            <div
                              key={student.studentId}
                              className="mb-3 flex items-center justify-between p-3 border rounded-lg"
                            >
                              <span className="font-medium">{student.studentName}</span>
                              <div className="flex items-center space-x-2">
                                <Label className="text-xs">Position:</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={additionalData.classPositions[student.studentId] || ""}
                                  onChange={(e) =>
                                    setAdditionalData((prev) => ({
                                      ...prev,
                                      classPositions: {
                                        ...prev.classPositions,
                                        [student.studentId]: Number.parseInt(e.target.value) || 0,
                                      },
                                    }))
                                  }
                                  className="w-16 h-8 text-xs"
                                  placeholder="1st"
                                />
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Attendance Record</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {marksData.map((student) => (
                            <div key={student.studentId} className="mb-3 p-3 border rounded-lg">
                              <h4 className="font-medium mb-2">{student.studentName}</h4>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Present</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={additionalData.attendance[student.studentId]?.present || ""}
                                    onChange={(e) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        attendance: {
                                          ...prev.attendance,
                                          [student.studentId]: {
                                            ...prev.attendance[student.studentId],
                                            present: Number.parseInt(e.target.value) || 0,
                                          },
                                        },
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Absent</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={additionalData.attendance[student.studentId]?.absent || ""}
                                    onChange={(e) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        attendance: {
                                          ...prev.attendance,
                                          [student.studentId]: {
                                            ...prev.attendance[student.studentId],
                                            absent: Number.parseInt(e.target.value) || 0,
                                          },
                                        },
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Total Days</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={additionalData.attendance[student.studentId]?.total || ""}
                                    onChange={(e) =>
                                      setAdditionalData((prev) => ({
                                        ...prev,
                                        attendance: {
                                          ...prev.attendance,
                                          [student.studentId]: {
                                            ...prev.attendance[student.studentId],
                                            total: Number.parseInt(e.target.value) || 0,
                                          },
                                        },
                                      }))
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>
                    <div className="flex justify-end mt-6">
                      <Button
                        onClick={handleSaveAttendancePosition}
                        className="bg-[#2d682d] hover:bg-[#1f4a1f] text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Attendance & Position
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="remarks" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Class Teacher General Remarks</CardTitle>
                        <CardDescription>Overall comments about each student's performance</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {marksData.map((student) => (
                          <div key={student.studentId} className="mb-4 p-3 border rounded-lg">
                            <Label className="text-sm font-medium">{student.studentName}</Label>
                            <Textarea
                              value={additionalData.classTeacherRemarks[student.studentId] || ""}
                              onChange={(e) =>
                                setAdditionalData((prev) => ({
                                  ...prev,
                                  classTeacherRemarks: {
                                    ...prev.classTeacherRemarks,
                                    [student.studentId]: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Enter overall class teacher remarks for this student..."
                              className="mt-2"
                              rows={2}
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                    <div className="flex justify-end mt-6">
                      <Button
                        onClick={handleSaveClassTeacherRemarks}
                        className="bg-[#2d682d] hover:bg-[#1f4a1f] text-white"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Class Teacher Remarks
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-[#2d682d]">Assignments</CardTitle>
                  <CardDescription>Manage assignments and view submissions</CardDescription>
                </div>
                <Button onClick={() => setShowCreateAssignment(true)} className="bg-[#2d682d] hover:bg-[#2d682d]/90">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockAssignments.map((assignment) => (
                  <div key={assignment.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{assignment.title}</h3>
                      <p className="text-sm text-gray-600">
                        {assignment.subject} - {assignment.class}
                      </p>
                      <p className="text-sm text-gray-500">Due: {assignment.dueDate}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">
                        {assignment.submissions}/{assignment.totalStudents} submitted
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => handleViewSubmissions(assignment)}>
                        View Submissions
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">My Students</CardTitle>
              <CardDescription>Students in your classes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockStudents.map((student) => (
                  <div key={student.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.class}</p>
                      <div className="flex gap-1 mt-1">
                        {student.subjects.map((subject, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timetable" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">My Timetable</CardTitle>
              <CardDescription>Your teaching schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockTimetable.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Clock className="w-4 h-4 text-[#b29032]" />
                      <div>
                        <p className="font-medium">
                          {slot.day} - {slot.time}
                        </p>
                        <p className="text-sm text-gray-600">
                          {slot.subject} - {slot.class}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Study Materials</CardTitle>
              <CardDescription>Upload and manage study materials for your students</CardDescription>
            </CardHeader>
            <CardContent>
              <StudyMaterials userRole="teacher" teacherSubjects={teacher.subjects} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="noticeboard" className="space-y-4">
          <Noticeboard userRole="teacher" userName={teacher.name} />
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <InternalMessaging currentUser={{ id: teacher.id, name: teacher.name, role: "teacher" }} />
        </TabsContent>
      </Tabs>

      {/* Create Assignment Dialog */}
      <Dialog open={showCreateAssignment} onOpenChange={setShowCreateAssignment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>Create an assignment for your students</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Assignment Title</Label>
              <Input
                id="title"
                value={assignmentForm.title}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Enter assignment title"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={assignmentForm.description}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Enter assignment description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={assignmentForm.subject}
                  onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, subject: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacher.subjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Select
                  value={assignmentForm.class}
                  onValueChange={(value) => setAssignmentForm((prev) => ({ ...prev, class: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacher.classes.map((className) => (
                      <SelectItem key={className} value={className}>
                        {className}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={assignmentForm.dueDate}
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="file">Attachment (Optional)</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) => setAssignmentForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateAssignment(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment} className="bg-[#2d682d] hover:bg-[#2d682d]/90">
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submissions Dialog */}
      <Dialog open={showSubmissions} onOpenChange={setShowSubmissions}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Assignment Submissions - {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.subject} - {selectedAssignment?.class}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {mockSubmissions.map((submission) => (
              <div key={submission.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{submission.studentName}</h3>
                  <p className="text-sm text-gray-600">
                    Status:{" "}
                    <Badge variant={submission.status === "submitted" ? "default" : "secondary"}>
                      {submission.status}
                    </Badge>
                  </p>
                  {submission.submissionDate && (
                    <p className="text-sm text-gray-500">Submitted: {submission.submissionDate}</p>
                  )}
                  {submission.file && <p className="text-sm text-blue-600">File: {submission.file}</p>}
                </div>
                <div className="flex space-x-2">
                  {submission.file && (
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                  {submission.status === "submitted" && (
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Grade
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSubmissions(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
