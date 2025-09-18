import { formatDistanceToNowStrict } from "date-fns"

import { AccountantDashboard } from "@/components/accountant-dashboard"
import { ActivityFeed } from "@/components/activity-feed"
import { NotificationCenter } from "@/components/notification-center"
import { SystemHealthMonitor } from "@/components/system-health-monitor"
import {
  getAccountantFinancialSnapshot,
  getAccountantProfile,
} from "@/lib/accountant-service"

export const metadata = {
  title: "Accountant Control Centre",
}

function formatRelative(value: string) {
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
  } catch (error) {
    console.error("Failed to format relative time", error)
    return "recently"
  }
}

export default async function AccountantPage() {
  const [profile, snapshot] = await Promise.all([
    getAccountantProfile(),
    getAccountantFinancialSnapshot(),
  ])

  return (
    <main className="space-y-10">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {profile.name
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Finance workspace</p>
              <h1 className="text-2xl font-semibold leading-tight">Welcome back, {profile.name.split(" ")[0]}</h1>
              <p className="text-sm text-muted-foreground">
                Office: {profile.officeLocation} • Ext: {profile.extension}
              </p>
              <p className="text-xs text-muted-foreground">
                Last login {formatRelative(profile.lastLogin)} • Contact: {profile.phone}
              </p>
            </div>
          </div>

          <dl className="grid flex-1 gap-4 text-sm sm:grid-cols-2 lg:max-w-xl">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="text-base font-semibold text-foreground">{profile.email}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Total revenue</dt>
              <dd className="text-base font-semibold text-foreground">
                ₦{Math.round(snapshot.totalRevenue).toLocaleString("en-NG")}
              </dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pending payments</dt>
              <dd className="text-base font-semibold text-foreground">{snapshot.pendingPayments}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Collection rate</dt>
              <dd className="text-base font-semibold text-foreground">{snapshot.collectionRate}%</dd>
            </div>
          </dl>
        </div>
      </section>

      <AccountantDashboard accountant={profile} />

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <ActivityFeed userRole="accountant" />
        <div className="space-y-8">
          <NotificationCenter userRole="accountant" />
          <SystemHealthMonitor />
        </div>
      </div>
    </main>
  )
}
