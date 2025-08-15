// app/student/page.tsx
// Mounts the Student Dashboard route.

import type { Metadata } from "next";
import StudentDashboard from "@/components/student-dashboard";

export const metadata: Metadata = {
  title: "Student Dashboard | VEA Portal",
  description: "Student overview: assignments, notices, and payments.",
};

export default function Page() {
  return <StudentDashboard />;
}
