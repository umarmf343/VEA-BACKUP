// app/teacher/page.tsx
// Mounts the Teacher Dashboard route.

import type { Metadata } from "next";
import TeacherDashboard from "@/components/teacher-dashboard";

export const metadata: Metadata = {
  title: "Teacher Dashboard | VEA Portal",
  description: "Teacher overview: assignments, submissions, and messages.",
};

export default function Page() {
  return <TeacherDashboard />;
}
