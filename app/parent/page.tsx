import { ParentDashboard } from "@/components/parent-dashboard";
import { ParentAssignmentReview } from "@/components/parent/assignment-review";
import { ParentAttendanceInsights } from "@/components/parent/attendance-insights";
import { ParentMeetingManager } from "@/components/parent/meeting-manager";
import { ParentNotificationCenter } from "@/components/parent/notification-center";
import { ParentPaymentCenter } from "@/components/parent/payment-center";
import { ParentScheduleOverview } from "@/components/parent/schedule-overview";
import { ParentStudentOverview } from "@/components/parent/student-overview";
import { ParentSupportCenter } from "@/components/parent/support-center";
import { getParentProfile, listParentFinancialAccounts, listParentStudents } from "@/lib/parent-service";

export const metadata = {
  title: "Parent Control Centre",
};

export default function ParentPage() {
  const profile = getParentProfile();
  const students = listParentStudents();
  const financials = listParentFinancialAccounts();

  const outstandingBalance = financials.reduce((sum, account) => sum + Math.max(account.balance, 0), 0);
  const nextDueDate = financials
    .map((account) => account.upcomingDueDate)
    .filter(Boolean)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];

  return (
    <main className="space-y-10">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {profile.name
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Guardian workspace</p>
              <h1 className="text-2xl font-semibold leading-tight">Good day, {profile.name.split(" ")[0]}</h1>
              <p className="text-sm text-muted-foreground">
                {students.length} {students.length === 1 ? "child" : "children"} linked • Preferred contact via {profile.preferredContactMethod}
              </p>
              <p className="text-xs text-muted-foreground">Timezone: {profile.timezone} • Contact: {profile.phone}</p>
            </div>
          </div>

          <dl className="grid flex-1 gap-4 text-sm sm:grid-cols-2 lg:max-w-xl">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd className="text-base font-semibold text-foreground">{profile.email}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Address</dt>
              <dd className="text-base font-semibold text-foreground">{profile.address}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding balance</dt>
              <dd className="text-base font-semibold text-foreground">₦{Math.round(outstandingBalance).toLocaleString("en-NG")}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Next due date</dt>
              <dd className="text-base font-semibold text-foreground">
                {nextDueDate
                  ? new Date(nextDueDate).toLocaleDateString("en-NG", { dateStyle: "medium" })
                  : "No pending dues"}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <ParentDashboard />

      <ParentStudentOverview />

      <div className="grid gap-8 xl:grid-cols-[2fr,1fr]">
        <ParentAssignmentReview />
        <div className="space-y-8">
          <ParentScheduleOverview />
          <ParentNotificationCenter />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr,1fr]">
        <ParentAttendanceInsights />
        <ParentPaymentCenter />
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr,1fr]">
        <ParentMeetingManager />
        <ParentSupportCenter />
      </div>
    </main>
  );
}
