import StudentDashboard from "@/components/student-dashboard";
import { StudentAssignmentTracker } from "@/components/student/assignment-tracker";
import { StudentCourseProgress } from "@/components/student/course-progress";
import { StudentGradeOverview } from "@/components/student/grade-overview";
import { StudentNotificationCenter } from "@/components/student/notification-center";
import { StudentScheduleOverview } from "@/components/student/schedule-overview";
import { StudentSupportPanel } from "@/components/student/support-panel";
import { getStudentFinancialOverview, getStudentProfile, listStudentAttendance } from "@/lib/student-service";

export const metadata = {
  title: "Student Learning Hub",
};

function calculateAttendanceAverage(attendance: ReturnType<typeof listStudentAttendance>) {
  if (!attendance.length) return 0;
  const total = attendance.reduce((sum, record) => sum + (record.attendanceRate ?? 0), 0);
  return total / attendance.length;
}

export default function StudentPage() {
  const profile = getStudentProfile();
  const attendance = listStudentAttendance();
  const financial = getStudentFinancialOverview();
  const attendanceAverage = calculateAttendanceAverage(attendance);
  const creditsRemaining = Math.max(profile.creditsRequired - profile.creditsCompleted, 0);

  return (
    <main className="space-y-10">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {profile.name
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Student workspace</p>
              <h1 className="text-2xl font-semibold leading-tight">Welcome back, {profile.name.split(" ")[0]}</h1>
              <p className="text-sm text-muted-foreground">
                {profile.programme} • Cohort: {profile.cohort}
              </p>
              <p className="text-xs text-muted-foreground">Advisor: {profile.advisorName}</p>
            </div>
          </div>

          <dl className="grid flex-1 gap-4 text-sm sm:grid-cols-2 lg:max-w-lg">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Current GPA</dt>
              <dd className="text-xl font-semibold text-foreground">{profile.gpa.toFixed(2)}</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Attendance</dt>
              <dd className="text-xl font-semibold text-foreground">{Math.round(attendanceAverage * 100)}%</dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Credits completed</dt>
              <dd className="text-xl font-semibold text-foreground">
                {profile.creditsCompleted} / {profile.creditsRequired}
              </dd>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Outstanding balance</dt>
              <dd className="text-xl font-semibold text-foreground">₦{financial.balance.toLocaleString("en-NG")}</dd>
              <p className="text-xs text-muted-foreground">Due {new Date(financial.upcomingDueDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}</p>
            </div>
          </dl>
        </div>
        <div className="mt-6 text-xs text-muted-foreground">
          Credits remaining: {creditsRemaining} • Scholarship: {financial.scholarshipPercentage}% • Last payment on {new Date(
            financial.lastPaymentDate
          ).toLocaleDateString("en-NG", { dateStyle: "medium" })}
        </div>
      </section>

      <StudentDashboard />

      <div className="grid gap-8 xl:grid-cols-[2fr,1fr]">
        <StudentAssignmentTracker />
        <div className="space-y-8">
          <StudentCourseProgress />
          <StudentScheduleOverview />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[2fr,1fr]">
        <StudentGradeOverview />
        <div className="space-y-8">
          <StudentNotificationCenter />
          <StudentSupportPanel />
        </div>
      </div>
    </main>
  );
}
