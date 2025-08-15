// app/admin/page.tsx
// Mounts the Admin Dashboard route.

import type { Metadata } from "next";
import AdminDashboard from "@/components/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin Dashboard | VEA Portal",
  description: "Admin overview: users, payments today, and notices.",
};

export default function Page() {
  return <AdminDashboard />;
}
