// app/super-admin/page.tsx
// Mounts the Super Admin Dashboard route.

import type { Metadata } from "next";
import SuperAdminDashboard from "@/components/super-admin-dashboard";

export const metadata: Metadata = {
  title: "Super Admin Dashboard | VEA Portal",
  description: "Super admin overview: tenants, uptime, and error rates.",
};

export default function Page() {
  return <SuperAdminDashboard />;
}
