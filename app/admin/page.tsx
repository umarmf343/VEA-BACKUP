import { Metadata } from "next"

import AdminDashboard from "@/components/admin-dashboard"
import PaymentManagement from "@/components/admin/payment-management"
import { UserManagement } from "@/components/admin/user-management"
import { SystemOverview } from "@/components/admin/system-overview"
import { ActivityFeed } from "@/components/activity-feed"
import { NotificationCenter } from "@/components/notification-center"
import { SystemHealthMonitor } from "@/components/system-health-monitor"

export const metadata: Metadata = {
  title: "Admin Control Center",
  description: "Central hub for managing users, payments, and school operations.",
}

export default function AdminPage() {
  return (
    <main className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <AdminDashboard />
          <SystemOverview />
        </div>
        <div className="space-y-6">
          <SystemHealthMonitor />
          <NotificationCenter userRole="admin" />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <ActivityFeed userRole="admin" className="border-[#2d682d]/20" />
        <PaymentManagement />
      </section>

      <section>
        <UserManagement />
      </section>
    </main>
  )
}
