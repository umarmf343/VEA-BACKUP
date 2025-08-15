// app/page.tsx
// Purpose: Stable, accessible landing page without hydration warnings.
// Fixes: Loading flicker, server/client markup mismatch, inconsistent spacing.
// Notes:
// - Marked as a Client Component because it uses useEffect/useState.
// - Uses the HSL token classes defined in app/globals.css.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Page() {
  // Avoids hydration mismatches by rendering only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Welcome to VEA Portal</h1>
        <p className="text-sm text-muted-foreground">
          Choose a dashboard or open a feature module to get started.
        </p>
      </header>

      {/* Quick actions (safe placeholders; update links as routes are ready) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Student Dashboard" href="/student" desc="Assignments, notices, payments" />
        <Card title="Teacher Dashboard" href="/teacher" desc="Classes, marks, messaging" />
        <Card title="Admin Dashboard" href="/admin" desc="Users, payments, notices" />
        <Card title="Super Admin" href="/super-admin" desc="Tenants, uptime, errors" />
      </div>

      {/* Feature shortcuts (match your components when wired) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Payments" href="/payments" desc="Initialize & manage payments" />
        <Card title="Study Materials" href="/materials" desc="Upload & download files" />
        <Card title="Noticeboard" href="/notices" desc="Create & publish notices" />
      </div>
    </section>
  );
}

function Card({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border bg-card p-4 transition hover:shadow-sm focus-visible:outline-none focus-visible:ring-2"
    >
      <div className="flex items-center gap-2">
        <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--brand))]" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </Link>
  );
}
