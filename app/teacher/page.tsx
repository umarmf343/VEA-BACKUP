import TeacherDashboard from "@/components/teacher-dashboard";
import { TeacherAssessmentQueue } from "@/components/teacher/assessment-queue";
import { TeacherAssignmentCenter } from "@/components/teacher/assignment-center";
import { TeacherClassRoster } from "@/components/teacher/class-roster";
import { TeacherCommunicationPanel } from "@/components/teacher/communication-panel";
import { TeacherNotificationPanel } from "@/components/teacher/notification-panel";
import { TeacherScheduleOverview } from "@/components/teacher/schedule-overview";
import { getTeacherProfile } from "@/lib/teacher-service";

export const metadata = {
  title: "Teacher Control Centre",
};

export default async function TeacherPage() {
  const profile = await getTeacherProfile();

  return (
    <main className="space-y-10">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {profile.name
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Teacher workspace</p>
              <h1 className="text-2xl font-semibold leading-tight">Welcome back, {profile.name.split(" ")[0]}</h1>
              <p className="text-sm text-muted-foreground">
                {profile.subjects.join(" • ")} • Form teacher: {profile.formTeacherOf ?? "—"}
              </p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground md:text-right">
            <p>Email: {profile.email}</p>
            <p>Experience: {profile.yearsOfExperience}+ years</p>
          </div>
        </div>
      </section>

      <TeacherDashboard />

      <div className="grid gap-8 lg:grid-cols-2">
        <TeacherAssignmentCenter />
        <div className="space-y-8">
          <TeacherClassRoster />
          <TeacherScheduleOverview />
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[2fr,1fr]">
        <TeacherCommunicationPanel />
        <div className="space-y-8">
          <TeacherAssessmentQueue />
          <TeacherNotificationPanel />
        </div>
      </div>
    </main>
  );
}
