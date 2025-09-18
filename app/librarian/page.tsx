import { formatDistanceToNowStrict } from "date-fns"

import { LibrarianDashboard } from "@/components/librarian-dashboard"
import { ActivityFeed } from "@/components/activity-feed"
import { NotificationCenter } from "@/components/notification-center"
import { SystemHealthMonitor } from "@/components/system-health-monitor"
import {
  buildLibrarySnapshot,
  getLibrarianProfile,
  getLibraryState,
} from "@/lib/librarian-service"

export const metadata = {
  title: "Librarian Control Centre",
}

function formatRelative(value: string) {
  try {
    return formatDistanceToNowStrict(new Date(value), { addSuffix: true })
  } catch (error) {
    console.error("Failed to format relative time", error)
    return "recently"
  }
}

export default async function LibrarianPage() {
  const [profile, state] = await Promise.all([getLibrarianProfile(), getLibraryState()])
  const snapshot = buildLibrarySnapshot(state)

  return (
    <main className="space-y-10">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Library workspace</p>
            <h1 className="text-2xl font-semibold leading-tight">
              Welcome back, {profile.name.split(" ")[0]}
            </h1>
            <p className="text-sm text-muted-foreground">
              Office: {profile.officeLocation} • Extension: {profile.extension}
            </p>
            <p className="text-xs text-muted-foreground">
              Last login {formatRelative(profile.lastLogin)} • Contact: {profile.phone}
            </p>
          </div>

          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:max-w-xl">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Titles catalogued</dt>
              <dd className="text-base font-semibold text-foreground">{snapshot.totalTitles}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Copies in circulation</dt>
              <dd className="text-base font-semibold text-foreground">{snapshot.totalCopies}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Active loans</dt>
              <dd className="text-base font-semibold text-foreground">{snapshot.borrowedActive}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Pending requests</dt>
              <dd className="text-base font-semibold text-foreground">{snapshot.pendingRequests}</dd>
            </div>
          </dl>
        </div>
      </section>

      <LibrarianDashboard
        librarian={profile}
        initialData={{ books: state.books, borrowed: state.borrowed, requests: state.requests }}
      />

      <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
        <ActivityFeed userRole="librarian" />
        <div className="space-y-8">
          <NotificationCenter userRole="librarian" />
          <SystemHealthMonitor />
        </div>
      </div>
    </main>
  )
}
