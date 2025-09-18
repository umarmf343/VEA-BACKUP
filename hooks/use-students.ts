"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

export type StudentPayload = {
  id: string
  name: string
  email: string
  classId?: string | null
  class?: string
  section?: string
  admissionNumber: string
  parentName?: string | null
  parentEmail?: string | null
  paymentStatus: "paid" | "pending" | "overdue"
  status: "active" | "inactive"
  dateOfBirth?: string | null
  address?: string | null
  phone?: string | null
  guardianPhone?: string | null
  bloodGroup?: string | null
  admissionDate?: string | null
  subjects?: string[]
  attendance?: { present: number; total: number }
  grades?: { subject: string; ca1: number; ca2: number; exam: number; total: number; grade: string }[]
  photoUrl?: string | null
}

async function fetchStudents(classId?: string | null) {
  const params = classId && classId !== "all" ? `?classId=${encodeURIComponent(classId)}` : ""
  const res = await fetch(`/api/students${params}`)
  if (!res.ok) throw new Error("Failed to load students")
  const data = await res.json()
  return (data.students ?? []) as StudentPayload[]
}

export function useStudents(classId?: string | null) {
  return useQuery({
    queryKey: ["students", classId ?? "all"],
    queryFn: () => fetchStudents(classId),
  })
}

export function useCreateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<StudentPayload>) => {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to create student")
      return (await res.json()).student as StudentPayload
    },
    onSuccess: (_data, _variables, context) => {
      void queryClient.invalidateQueries({ queryKey: ["students"] })
    },
  })
}

export function useUpdateStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<StudentPayload> & { id: string }) => {
      const res = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed to update student")
      return (await res.json()).student as StudentPayload
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] })
    },
  })
}

export function useDeleteStudent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/students?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Failed to delete student")
      return (await res.json()).student as StudentPayload
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["students"] })
    },
  })
}
