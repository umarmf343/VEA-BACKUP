"use client"

import * as React from "react"
import { Users, UserPlus, Edit, Trash2, UserCheck, Shield, Key, Eye, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const API = {
  base: "/api/admin/users",
  resetPassword: "/api/admin/users/reset-password",
}

type UserRole = "super-admin" | "admin" | "teacher" | "student" | "parent" | "librarian" | "accountant"

type UserStatus = "active" | "suspended" | "inactive"

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
  lastLogin?: string
  assignedClasses?: string[]
  assignedSubjects?: string[]
  parentId?: string
  studentIds?: string[]
}

const AVAILABLE_CLASSES = [
  "JSS1A",
  "JSS1B",
  "JSS2A",
  "JSS2B",
  "JSS3A",
  "JSS3B",
  "SS1A",
  "SS1B",
  "SS2A",
  "SS2B",
  "SS3A",
  "SS3B",
]

const AVAILABLE_SUBJECTS = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "Economics",
]

export function UserManagement() {
  const [users, setUsers] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [isPasswordResetOpen, setIsPasswordResetOpen] = React.useState(false)
  const [isProfileViewOpen, setIsProfileViewOpen] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [newPassword, setNewPassword] = React.useState("")
  const alertRef = React.useRef<HTMLDivElement | null>(null)

  const [newUser, setNewUser] = React.useState({
    name: "",
    email: "",
    role: "teacher" as UserRole,
    password: "",
    studentIds: [] as string[],
  })

  const availableParents = React.useMemo(() => users.filter((user) => user.role === "parent"), [users])
  const availableStudents = React.useMemo(() => users.filter((user) => user.role === "student"), [users])

  const loadUsers = React.useCallback(
    async (initial = false) => {
      if (initial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)
      try {
        const res = await fetch(API.base, { cache: "no-store" })
        if (!res.ok) {
          throw new Error((await res.text()) || "Unable to load users")
        }
        const payload = await res.json()
        const list = Array.isArray(payload?.users) ? (payload.users as User[]) : []
        setUsers(list)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load users"
        setError(message)
        requestAnimationFrame(() => alertRef.current?.focus())
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [],
  )

  React.useEffect(() => {
    loadUsers(true)
  }, [loadUsers])

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      setError("Name and email are required")
      requestAnimationFrame(() => alertRef.current?.focus())
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(API.base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          studentIds: newUser.role === "parent" ? newUser.studentIds : undefined,
        }),
      })
      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to create user")
      }
      await loadUsers(false)
      setNewUser({ name: "", email: "", role: "teacher", password: "", studentIds: [] })
      setIsAddDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create user"
      setError(message)
      requestAnimationFrame(() => alertRef.current?.focus())
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(API.base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingUser.id,
          updates: {
            name: editingUser.name,
            email: editingUser.email,
            role: editingUser.role,
            status: editingUser.status,
            assignedClasses: editingUser.assignedClasses,
            assignedSubjects: editingUser.assignedSubjects,
            studentIds: editingUser.studentIds,
          },
        }),
      })
      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to update user")
      }
      await loadUsers(false)
      setEditingUser(null)
      setIsEditDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user"
      setError(message)
      requestAnimationFrame(() => alertRef.current?.focus())
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(API.base, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to delete user")
      }
      await loadUsers(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user"
      setError(message)
      requestAnimationFrame(() => alertRef.current?.focus())
    } finally {
      setBusyId(null)
    }
  }

  const handleSuspendUser = async (id: string) => {
    const user = users.find((candidate) => candidate.id === id)
    if (!user) return

    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(API.base, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          updates: { status: user.status === "suspended" ? "active" : "suspended" },
        }),
      })
      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to update status")
      }
      await loadUsers(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update status"
      setError(message)
      requestAnimationFrame(() => alertRef.current?.focus())
    } finally {
      setBusyId(null)
    }
  }

  const handlePasswordReset = async () => {
    if (!selectedUser || !newPassword) return

    setSaving(true)
    setError(null)
    try {
      const res = await fetch(API.resetPassword, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedUser.id }),
      })
      if (!res.ok) {
        throw new Error((await res.text()) || "Failed to reset password")
      }
      await loadUsers(false)
      setNewPassword("")
      setIsPasswordResetOpen(false)
      setSelectedUser(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to reset password"
      setError(message)
      requestAnimationFrame(() => alertRef.current?.focus())
    } finally {
      setSaving(false)
    }
  }

  const getRoleColor = (role: UserRole) => {
    const colors = {
      "super-admin": "bg-red-100 text-red-800",
      admin: "bg-blue-100 text-blue-800",
      teacher: "bg-green-100 text-green-800",
      student: "bg-purple-100 text-purple-800",
      parent: "bg-orange-100 text-orange-800",
      librarian: "bg-cyan-100 text-cyan-800",
      accountant: "bg-yellow-100 text-yellow-800",
    }
    return colors[role]
  }

  const getStatusColor = (status: UserStatus) => {
    const colors = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      inactive: "bg-gray-100 text-gray-800",
    }
    return colors[status]
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-[#2d682d]">User Management</h3>
          <p className="text-sm text-gray-600">Manage all system users and their roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => loadUsers(false)} disabled={loading || refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-[#2d682d] hover:bg-[#1a4a1a]" disabled={saving}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(event) => setNewUser({ ...newUser, name: event.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(event) => setNewUser({ ...newUser, email: event.target.value })}
                    placeholder="Enter email address"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value: UserRole) => setNewUser({ ...newUser, role: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(event) => setNewUser({ ...newUser, password: event.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                {newUser.role === "parent" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-orange-600" />
                        <Label className="font-medium text-orange-800">Parent-Student Assignment</Label>
                      </div>
                      <p className="mb-3 text-sm text-orange-700">
                        Assign students (children) to this parent for fee payment and report card access
                      </p>

                      <div>
                        <Label className="text-sm font-medium">Select Students (Children) *</Label>
                        <div className="mt-2 space-y-2">
                          {availableStudents.length > 0 ? (
                            <div className="grid max-h-32 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-2">
                              {availableStudents.map((student) => (
                                <div key={student.id} className="flex items-center space-x-2 rounded p-2 hover:bg-gray-50">
                                  <Checkbox
                                    id={`new-student-${student.id}`}
                                    checked={newUser.studentIds.includes(student.id)}
                                    onCheckedChange={(checked) => {
                                      const updatedStudents = checked
                                        ? [...newUser.studentIds, student.id]
                                        : newUser.studentIds.filter((candidate) => candidate !== student.id)
                                      setNewUser({ ...newUser, studentIds: updatedStudents })
                                    }}
                                  />
                                  <div className="flex-1">
                                    <Label htmlFor={`new-student-${student.id}`} className="cursor-pointer text-sm font-medium">
                                      {student.name}
                                    </Label>
                                    <p className="text-xs text-gray-500">{student.email}</p>
                                    {student.assignedClasses?.[0] && (
                                      <Badge variant="outline" className="mt-1 text-xs">
                                        {student.assignedClasses[0]}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border-2 border-dashed border-gray-200 py-4 text-center text-gray-500">
                              <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                              <p className="text-sm">No students available</p>
                              <p className="text-xs">Create student accounts first</p>
                            </div>
                          )}

                          {newUser.studentIds.length > 0 && (
                            <div className="rounded border border-green-200 bg-green-50 p-2 text-sm text-green-800">
                              ✓ {newUser.studentIds.length} student{newUser.studentIds.length > 1 ? "s" : ""} selected
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <Button onClick={handleAddUser} className="w-full bg-[#2d682d] hover:bg-[#1a4a1a]" disabled={saving}>
                  {saving ? "Saving…" : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
        >
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Users ({users.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-[#2d682d]">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading users…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>{user.role.replace("-", " ")}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : "Never"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsProfileViewOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUser(user)
                            setIsEditDialogOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user)
                            setIsPasswordResetOpen(true)
                          }}
                        >
                          <Key className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSuspendUser(user.id)}
                          disabled={busyId === user.id}
                          className={user.status === "suspended" ? "bg-green-50" : "bg-red-50"}
                        >
                          {busyId === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.status === "suspended" ? (
                            <UserCheck className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={busyId === user.id}
                          className="text-red-600 hover:text-red-800"
                        >
                          {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and role-specific assignments</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="max-h-96 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input
                    id="edit-name"
                    value={editingUser.name}
                    onChange={(event) => setEditingUser({ ...editingUser, name: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingUser.email}
                    onChange={(event) => setEditingUser({ ...editingUser, email: event.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editingUser.role}
                    onValueChange={(value: UserRole) => setEditingUser({ ...editingUser, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="librarian">Librarian</SelectItem>
                      <SelectItem value="accountant">Accountant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={editingUser.status}
                    onValueChange={(value: UserStatus) => setEditingUser({ ...editingUser, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editingUser.role === "teacher" && (
                <div className="space-y-4">
                  <div>
                    <Label>Assigned Classes</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {AVAILABLE_CLASSES.map((className) => (
                        <div key={className} className="flex items-center space-x-2">
                          <Checkbox
                            id={`class-${className}`}
                            checked={editingUser.assignedClasses?.includes(className) || false}
                            onCheckedChange={(checked) => {
                              const current = editingUser.assignedClasses || []
                              const next = checked
                                ? [...current, className]
                                : current.filter((entry) => entry !== className)
                              setEditingUser({ ...editingUser, assignedClasses: next })
                            }}
                          />
                          <Label htmlFor={`class-${className}`} className="text-sm">
                            {className}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label>Assigned Subjects</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {AVAILABLE_SUBJECTS.map((subject) => (
                        <div key={subject} className="flex items-center space-x-2">
                          <Checkbox
                            id={`subject-${subject}`}
                            checked={editingUser.assignedSubjects?.includes(subject) || false}
                            onCheckedChange={(checked) => {
                              const current = editingUser.assignedSubjects || []
                              const next = checked
                                ? [...current, subject]
                                : current.filter((entry) => entry !== subject)
                              setEditingUser({ ...editingUser, assignedSubjects: next })
                            }}
                          />
                          <Label htmlFor={`subject-${subject}`} className="text-sm">
                            {subject}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editingUser.role === "parent" && (
                <div className="space-y-3">
                  <Label>Assigned Students</Label>
                  {availableStudents.length > 0 ? (
                    <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto rounded-md border p-2">
                      {availableStudents.map((student) => (
                        <div key={student.id} className="flex items-center space-x-2 rounded p-2 hover:bg-gray-50">
                          <Checkbox
                            id={`parent-student-${student.id}`}
                            checked={editingUser.studentIds?.includes(student.id) || false}
                            onCheckedChange={(checked) => {
                              const current = editingUser.studentIds || []
                              const next = checked
                                ? [...current, student.id]
                                : current.filter((entry) => entry !== student.id)
                              setEditingUser({ ...editingUser, studentIds: next })
                            }}
                          />
                          <Label htmlFor={`parent-student-${student.id}`} className="text-sm">
                            {student.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-gray-200 py-4 text-center text-gray-500">
                      <Users className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="text-sm">No students available</p>
                    </div>
                  )}
                  <div className="rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-800">
                    Currently assigned to {editingUser.studentIds?.length || 0} student
                    {(editingUser.studentIds?.length || 0) !== 1 ? "s" : ""}
                  </div>
                </div>
              )}

              <Button onClick={handleEditUser} className="w-full bg-[#2d682d] hover:bg-[#1a4a1a]" disabled={saving}>
                {saving ? "Saving…" : "Update User"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.name} ({selectedUser?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handlePasswordReset}
                className="flex-1 bg-[#2d682d] hover:bg-[#1a4a1a]"
                disabled={saving || !newPassword}
              >
                {saving ? "Resetting…" : "Reset Password"}
              </Button>
              <Button variant="outline" onClick={() => setIsPasswordResetOpen(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileViewOpen} onOpenChange={setIsProfileViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>View detailed user information</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="text-sm font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Role</Label>
                  <Badge className={getRoleColor(selectedUser.role)}>{selectedUser.role.replace("-", " ")}</Badge>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedUser.status)}>{selectedUser.status}</Badge>
                </div>
                <div>
                  <Label>Created</Label>
                  <p className="text-sm">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Last Login</Label>
                  <p className="text-sm">{selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : "Never"}</p>
                </div>
              </div>

              {selectedUser.role === "teacher" && (
                <div className="space-y-2">
                  <Label>Assigned Classes</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.assignedClasses?.length ? (
                      selectedUser.assignedClasses.map((className) => (
                        <Badge key={className} variant="outline">
                          {className}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No classes assigned</p>
                    )}
                  </div>
                  <Label>Assigned Subjects</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedUser.assignedSubjects?.length ? (
                      selectedUser.assignedSubjects.map((subject) => (
                        <Badge key={subject} variant="outline">
                          {subject}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No subjects assigned</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
