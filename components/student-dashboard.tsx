"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BookOpen, Calendar, FileText, User, Clock, Trophy, Upload, CheckCircle } from "lucide-react"
import { StudyMaterials } from "@/components/study-materials"
import { Noticeboard } from "@/components/noticeboard"
import { DatabaseManager } from "@/lib/database-manager"

interface StudentDashboardProps {
  student: {
    id: string
    name: string
    email: string
    class: string
    admissionNumber: string
  }
}

export function StudentDashboard({ student }: StudentDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null)
  const [submissionForm, setSubmissionForm] = useState({
    file: null as File | null,
    comment: "",
  })

  const [subjects, setSubjects] = useState<any[]>([])
  const [timetable, setTimetable] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [libraryBooks, setLibraryBooks] = useState<any[]>([])
  const [attendance, setAttendance] = useState({ present: 0, total: 0, percentage: 0 })
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [studentProfile, setStudentProfile] = useState(student)
  const [showProfileEdit, setShowProfileEdit] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: student.name,
    email: student.email,
    phone: "",
    address: "",
    emergencyContact: "",
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dbManager] = useState(() => new DatabaseManager())

  useEffect(() => {
    const loadStudentData = async () => {
      try {
        setLoading(true)

        // Load subjects and grades
        const gradesResponse = await fetch(`/api/grades?studentId=${student.id}`)
        const gradesData = await gradesResponse.json()
        setSubjects(gradesData.grades || [])

        // Load assignments
        const assignmentsData = await dbManager.getAssignments(student.id)
        setAssignments(assignmentsData)

        // Load timetable
        const timetableData = await dbManager.getTimetable(student.class)
        setTimetable(timetableData)

        // Load library books
        const libraryData = await dbManager.getLibraryBooks(student.id)
        setLibraryBooks(libraryData)

        const attendanceData = await dbManager.getStudentAttendance(student.id)
        setAttendance(attendanceData)

        const eventsData = await dbManager.getUpcomingEvents(student.class)
        setUpcomingEvents(eventsData)

        const profileData = await dbManager.getStudentProfile(student.id)
        if (profileData) {
          setStudentProfile(profileData)
          setProfileForm({
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone || "",
            address: profileData.address || "",
            emergencyContact: profileData.emergencyContact || "",
          })
        }
      } catch (error) {
        console.error("Failed to load student data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadStudentData()

    const handleGradesUpdate = (data: any) => {
      if (data.studentId === student.id) {
        setSubjects((prev) => prev.map((subject) => (subject.id === data.id ? { ...subject, ...data } : subject)))
      }
    }

    const handleAssignmentsUpdate = (data: any) => {
      if (data.studentId === student.id) {
        setAssignments((prev) =>
          prev.map((assignment) => (assignment.id === data.id ? { ...assignment, ...data } : assignment)),
        )
      }
    }

    const handleAttendanceUpdate = (data: any) => {
      if (data.studentId === student.id) {
        setAttendance(data)
      }
    }

    const handleEventsUpdate = (data: any) => {
      if (data.class === student.class) {
        setUpcomingEvents(data.events)
      }
    }

    const handleProfileUpdate = (data: any) => {
      if (data.id === student.id) {
        setStudentProfile(data)
      }
    }

    dbManager.addEventListener("gradesUpdate", handleGradesUpdate)
    dbManager.addEventListener("assignmentsUpdate", handleAssignmentsUpdate)
    dbManager.addEventListener("attendanceUpdate", handleAttendanceUpdate)
    dbManager.addEventListener("eventsUpdate", handleEventsUpdate)
    dbManager.addEventListener("profileUpdate", handleProfileUpdate)

    return () => {
      dbManager.removeEventListener("gradesUpdate", handleGradesUpdate)
      dbManager.removeEventListener("assignmentsUpdate", handleAssignmentsUpdate)
      dbManager.removeEventListener("attendanceUpdate", handleAttendanceUpdate)
      dbManager.removeEventListener("eventsUpdate", handleEventsUpdate)
      dbManager.removeEventListener("profileUpdate", handleProfileUpdate)
    }
  }, [student.id, dbManager])

  const handleSaveProfile = async () => {
    try {
      setSaving(true)
      const updatedProfile = {
        ...studentProfile,
        ...profileForm,
        updatedAt: new Date().toISOString(),
      }

      await dbManager.updateStudentProfile(student.id, updatedProfile)
      setStudentProfile(updatedProfile)
      setShowProfileEdit(false)
    } catch (error) {
      console.error("Failed to save profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleRenewBook = async (bookId: string) => {
    try {
      await dbManager.renewLibraryBook(bookId, student.id)
      const updatedBooks = await dbManager.getLibraryBooks(student.id)
      setLibraryBooks(updatedBooks)
    } catch (error) {
      console.error("Failed to renew book:", error)
    }
  }

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return

    try {
      const submissionData = {
        assignmentId: selectedAssignment.id,
        studentId: student.id,
        status: "submitted",
        submittedAt: new Date().toISOString(),
        submittedFile: submissionForm.file?.name || null,
        submittedComment: submissionForm.comment,
      }

      // Save to database
      await dbManager.submitAssignment(submissionData)

      // Update local state
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === selectedAssignment.id ? { ...assignment, ...submissionData } : assignment,
        ),
      )

      setShowSubmitConfirm(false)
      setSelectedAssignment(null)
      setSubmissionForm({ file: null, comment: "" })
    } catch (error) {
      console.error("Failed to submit assignment:", error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "submitted":
        return "default"
      case "sent":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "submitted":
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case "sent":
        return <Clock className="w-4 h-4 text-orange-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d682d] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading student data...</p>
        </div>
      </div>
    )
  }

  const averageGrade =
    subjects.length > 0
      ? Math.round(subjects.reduce((sum, subject) => sum + (subject.total || 0), 0) / subjects.length)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2d682d] to-[#b29032] text-white p-6 rounded-lg">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {studentProfile.name}</h1>
            <p className="text-green-100">Student Portal - {student.class} - VEA 2025</p>
            <p className="text-sm text-green-200">Admission No: {student.admissionNumber}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => setShowProfileEdit(true)}
          >
            <User className="w-4 h-4 mr-1" />
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{subjects.length}</p>
                <p className="text-sm text-gray-600">Subjects</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{assignments.length}</p>
                <p className="text-sm text-gray-600">Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{averageGrade}%</p>
                <p className="text-sm text-gray-600">Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{attendance.percentage}%</p>
                <p className="text-sm text-gray-600">Attendance</p>
                <p className="text-xs text-gray-500">
                  {attendance.present}/{attendance.total} days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Academic Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjects.slice(0, 3).map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium">{subject.subject}</span>
                        <span className="text-sm text-[#b29032] font-bold">{subject.grade}</span>
                      </div>
                      <Progress value={subject.total || 0} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.slice(0, 3).map((event, index) => (
                      <div key={index} className="p-2 bg-yellow-50 border-l-4 border-[#b29032] rounded">
                        <p className="font-medium">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.date}</p>
                        {event.description && <p className="text-xs text-gray-500">{event.description}</p>}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No upcoming events</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Noticeboard userRole="student" userName={studentProfile.name} />
          </div>
        </TabsContent>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">My Subjects</CardTitle>
              <CardDescription>View your subjects and assigned teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjects.map((subject, index) => (
                  <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{subject.subject}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <User className="w-4 h-4 text-[#2d682d]" />
                        <p className="text-sm font-medium text-[#2d682d]">
                          Teacher: {subject.teacherName || "Not Assigned"}
                        </p>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Performance</span>
                          <span className="font-medium">{subject.total || 0}%</span>
                        </div>
                        <Progress value={subject.total || 0} className="h-2" />
                      </div>
                    </div>
                    <div className="ml-4 text-center">
                      <Badge variant="outline" className="text-[#b29032] border-[#b29032] font-bold text-lg px-3 py-1">
                        {subject.grade || "N/A"}
                      </Badge>
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
              <CardTitle className="text-[#2d682d]">Class Timetable</CardTitle>
              <CardDescription>Your weekly class schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {timetable.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <Clock className="w-4 h-4 text-[#b29032]" />
                      <div>
                        <p className="font-medium">
                          {slot.day} - {slot.time}
                        </p>
                        <p className="text-sm text-gray-600">
                          {slot.subject} with {slot.teacher}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Assignments</CardTitle>
              <CardDescription>Track your assignments and submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(assignment.status)}
                          <h3 className="font-medium">{assignment.title}</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                          {assignment.subject} - {assignment.teacher}
                        </p>
                        <p className="text-sm text-gray-500">Due: {assignment.dueDate}</p>
                        <p className="text-sm text-gray-700 mt-1">{assignment.description}</p>
                        {assignment.submittedAt && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                            <p className="text-sm text-green-700 font-medium">✓ Submitted: {assignment.submittedAt}</p>
                            {assignment.submittedFile && (
                              <p className="text-xs text-green-600">File: {assignment.submittedFile}</p>
                            )}
                            {assignment.submittedComment && (
                              <p className="text-xs text-green-600">Comment: {assignment.submittedComment}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={getStatusColor(assignment.status)}>
                          {assignment.status === "sent"
                            ? "Sent"
                            : assignment.status === "submitted"
                              ? "Submitted"
                              : assignment.status}
                        </Badge>
                      </div>
                    </div>

                    {assignment.status === "sent" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          className="bg-[#2d682d] hover:bg-[#2d682d]/90"
                          onClick={() => {
                            setSelectedAssignment(assignment)
                            setShowSubmitConfirm(true)
                          }}
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Submit Assignment
                        </Button>
                      </div>
                    )}
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
              <CardDescription>Access study materials for your class ({student.class})</CardDescription>
            </CardHeader>
            <CardContent>
              <StudyMaterials userRole="student" studentClass={student.class} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Library Books</CardTitle>
              <CardDescription>Manage your borrowed books</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {libraryBooks.map((book) => (
                  <div key={book.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{book.title}</h3>
                      <p className="text-sm text-gray-600">by {book.author}</p>
                      <p className="text-sm text-gray-500">Due: {book.dueDate}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={book.status === "overdue" ? "destructive" : "default"}>{book.status}</Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRenewBook(book.id)}
                        disabled={book.status === "overdue"}
                      >
                        Renew
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showProfileEdit} onOpenChange={setShowProfileEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your personal information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileForm.phone}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={profileForm.address}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="emergency">Emergency Contact</Label>
              <Input
                id="emergency"
                value={profileForm.emergencyContact}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, emergencyContact: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileEdit(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving} className="bg-[#2d682d] hover:bg-[#2d682d]/90">
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Submission Dialog */}
      <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.title} - {selectedAssignment?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Upload File (Optional)</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) =>
                  setSubmissionForm((prev) => ({
                    ...prev,
                    file: e.target.files?.[0] || null,
                  }))
                }
              />
            </div>
            <div>
              <Label htmlFor="comment">Comment (Optional)</Label>
              <Textarea
                id="comment"
                placeholder="Add any comments about your submission..."
                value={submissionForm.comment}
                onChange={(e) => setSubmissionForm((prev) => ({ ...prev, comment: e.target.value }))}
              />
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">Are you sure you want to submit this assignment?</p>
              <p className="text-xs text-yellow-700 mt-1">
                Once submitted, the status will change to "Submitted" and your teacher will be notified.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
              No, Cancel
            </Button>
            <Button onClick={handleSubmitAssignment} className="bg-[#2d682d] hover:bg-[#2d682d]/90">
              Yes, Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
