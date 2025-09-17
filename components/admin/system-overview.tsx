"use client"

import * as React from "react"
import { AlertCircle, BookOpen, CreditCard, GraduationCap, TrendingUp, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const ENDPOINT = "/api/admin/system-overview"

type OverviewStats = {
  totalStudents: number
  activeStudents: number
  totalTeachers: number
  totalRevenue: number
  paidStudents: number
  pendingPayments: number
  overduePayments: number
}

const INITIAL_STATS: OverviewStats = {
  totalStudents: 0,
  activeStudents: 0,
  totalTeachers: 0,
  totalRevenue: 0,
  paidStudents: 0,
  pendingPayments: 0,
  overduePayments: 0,
}

export function SystemOverview() {
  const [stats, setStats] = React.useState<OverviewStats>(INITIAL_STATS)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [refreshing, setRefreshing] = React.useState(false)
  const alertRef = React.useRef<HTMLDivElement | null>(null)

  const load = React.useCallback(
    async (initial = false) => {
      if (initial) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }
      setError(null)

      try {
        const response = await fetch(ENDPOINT, { cache: "no-store" })
        if (!response.ok) {
          throw new Error((await response.text()) || "Failed to load overview")
        }

        const payload = await response.json()
        const overview = payload?.overview as Partial<OverviewStats>
        setStats({ ...INITIAL_STATS, ...overview })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load overview"
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
    load(true)
  }, [load])

  const paymentRate = stats.totalStudents > 0 ? (stats.paidStudents / stats.totalStudents) * 100 : 0
  const activeRate = stats.totalStudents > 0 ? (stats.activeStudents / stats.totalStudents) * 100 : 0

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#2d682d]">System Overview</h3>
          <p className="text-sm text-gray-600">Live breakdown of students, staff, and payments</p>
        </div>
        <Button variant="outline" onClick={() => load(false)} disabled={loading || refreshing}>
          {refreshing ? "Refreshing…" : "Refresh"}
        </Button>
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

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={<Users className="h-6 w-6 text-[#2d682d]" />}
          iconClass="bg-[#2d682d]/10"
          loading={loading}
        />
        <StatCard
          title="Teachers"
          value={stats.totalTeachers}
          icon={<GraduationCap className="h-6 w-6 text-[#b29032]" />}
          iconClass="bg-[#b29032]/10"
          loading={loading}
        />
        <StatCard
          title="Revenue"
          value={stats.totalRevenue}
          format={(value) => `₦${(value / 1_000_000).toFixed(1)}M`}
          icon={<CreditCard className="h-6 w-6 text-green-600" />}
          iconClass="bg-green-100"
          loading={loading}
        />
        <StatCard
          title="Active Students"
          value={stats.activeStudents}
          icon={<BookOpen className="h-6 w-6 text-blue-600" />}
          iconClass="bg-blue-100"
          loading={loading}
        />
      </div>

      {/* Progress Indicators */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="border-[#2d682d]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#2d682d]">
              <TrendingUp className="h-5 w-5" />
              Payment Progress
            </CardTitle>
            <CardDescription>Current term fee collection status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Payment Rate</span>
                <span className="font-medium">{paymentRate.toFixed(1)}%</span>
              </div>
              <Progress value={paymentRate} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <MetricColumn label="Paid" value={stats.paidStudents} tone="green" loading={loading} />
              <MetricColumn label="Pending" value={stats.pendingPayments} tone="yellow" loading={loading} />
              <MetricColumn label="Overdue" value={stats.overduePayments} tone="red" loading={loading} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#b29032]/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#b29032]">
              <Users className="h-5 w-5" />
              Student Activity
            </CardTitle>
            <CardDescription>Active vs inactive student status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Active Rate</span>
                <span className="font-medium">{activeRate.toFixed(1)}%</span>
              </div>
              <Progress value={activeRate} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <MetricColumn label="Active" value={stats.activeStudents} tone="emerald" loading={loading} />
              <MetricColumn label="Inactive" value={Math.max(stats.totalStudents - stats.activeStudents, 0)} tone="slate" loading={loading} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            System Alerts
          </CardTitle>
          <CardDescription className="text-red-600">Important notifications requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AlertRow
              tone="red"
              title={`${stats.overduePayments} overdue payments`}
              description="Students with payment delays need follow-up"
              loading={loading}
            />
            <AlertRow
              tone="yellow"
              title={`${stats.pendingPayments} pending payments`}
              description="Offline payments awaiting verification"
              loading={loading}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  iconClass,
  loading,
  format,
}: {
  title: string
  value: number
  icon: React.ReactNode
  iconClass: string
  loading: boolean
  format?: (value: number) => string
}) {
  return (
    <Card className="border border-transparent shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 ${iconClass}`}>{icon}</div>
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            {loading ? (
              <div className="mt-1 h-6 w-20 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="text-2xl font-bold text-[#2d682d]">{format ? format(value) : value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

type MetricTone = "green" | "yellow" | "red" | "emerald" | "slate"

function MetricColumn({
  label,
  value,
  tone,
  loading,
}: {
  label: string
  value: number
  tone: MetricTone
  loading: boolean
}) {
  const colorMap: Record<MetricTone, string> = {
    green: "text-green-600",
    emerald: "text-emerald-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    slate: "text-slate-600",
  }

  return (
    <div className="text-center">
      {loading ? (
        <div className="mx-auto h-6 w-12 animate-pulse rounded bg-gray-200" />
      ) : (
        <p className={`${colorMap[tone]} font-semibold`}>{value}</p>
      )}
      <p className="text-gray-600">{label}</p>
    </div>
  )
}

function AlertRow({
  tone,
  title,
  description,
  loading,
}: {
  tone: "red" | "yellow"
  title: string
  description: string
  loading: boolean
}) {
  const palette =
    tone === "red"
      ? {
          border: "border-red-200",
          icon: "text-red-500",
          title: "text-red-700",
          description: "text-red-600",
        }
      : {
          border: "border-yellow-200",
          icon: "text-yellow-500",
          title: "text-yellow-700",
          description: "text-yellow-600",
        }

  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${palette.border}`}>
      <AlertCircle className={`h-4 w-4 ${palette.icon}`} />
      <div>
        {loading ? (
          <>
            <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
            <div className="mt-1 h-3 w-56 animate-pulse rounded bg-gray-100" />
          </>
        ) : (
          <>
            <p className={`text-sm font-medium ${palette.title}`}>{title}</p>
            <p className={`text-xs ${palette.description}`}>{description}</p>
          </>
        )}
      </div>
    </div>
  )
}
