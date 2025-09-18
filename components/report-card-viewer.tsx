"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { EnhancedReportCard } from "@/components/enhanced-report-card"
import type { ReportCardResponse } from "@/lib/report-card-types"
import { useNotification } from "@/hooks/use-notification"

interface ReportCardViewerProps {
  studentId: string
  studentName: string
  userRole: string
  hasAccess: boolean
}

export function ReportCardViewer({ studentId, studentName, userRole, hasAccess }: ReportCardViewerProps) {
  const [selectedTerm, setSelectedTerm] = useState("First Term")
  const [selectedSession, setSelectedSession] = useState("2024/2025")
  const [reportCardData, setReportCardData] = useState<ReportCardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { notifyError, notifyInfo, notifyWarning } = useNotification()

  const loadReportCard = async () => {
    if (!hasAccess) {
      notifyWarning("Access denied", {
        description: "Complete payment or contact the administrator to view report cards.",
      })
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        studentId,
        term: selectedTerm,
        session: selectedSession,
      })

      const response = await fetch(`/api/report-cards?${params.toString()}`)

      if (!response.ok) {
        if (response.status === 404) {
          notifyInfo("No report card found", {
            description: "Try another term or session, or contact the school office.",
          })
          setReportCardData(null)
          return
        }
        throw new Error(`Failed to load report card: ${response.statusText}`)
      }

      const payload = (await response.json()) as { data: ReportCardResponse }
      setReportCardData(payload.data)
    } catch (error) {
      console.error("Error loading report card:", error)
      notifyError("Unable to load report card", {
        description: "Please try again shortly.",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasAccess) {
      loadReportCard()
    }
  }, [selectedTerm, selectedSession, hasAccess])

  if (!hasAccess) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600 mb-4">Please complete school fee payment to access report cards.</p>
        <Button className="bg-[#b29032] hover:bg-[#b29032]/90">Pay School Fees</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Selection Controls */}
      <div className="flex gap-4 items-end">
        <div>
          <Label>Term</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Session</Label>
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024/2025">2024/2025</SelectItem>
              <SelectItem value="2023/2024">2023/2024</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={loadReportCard} disabled={loading}>
          {loading ? "Loading..." : "Load Report Card"}
        </Button>
      </div>

      {/* Report Card Display */}
      {reportCardData && <EnhancedReportCard data={reportCardData} />}
    </div>
  )
}
