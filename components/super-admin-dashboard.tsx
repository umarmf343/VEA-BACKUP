// components/super-admin-dashboard.tsx
// Purpose: Stable super-admin overview with reliable polling + accessible UI.
// Fixes addressed:
// - Unstable rendering (explicit client component)
// - No refresh / retry path (manual refresh + 10s polling)
// - Missing accessible error surfacing and focus management
// - Inconsistent metric cards and spacing
//
// Expected API (adjust if your routes differ):
//   GET /api/dashboard/super-admin -> { tenants: number; uptime: string; errors24h: number }
//
// Dependencies: uses global token classes from app/globals.css and cn().

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SuperData = {
  tenants: number;
  uptime: string;     // e.g., "99.98%" or "14d 02h 11m"
  errors24h: number;
};

const ENDPOINT = "/api/dashboard/super-admin";
const POLL_MS = 10_000;

export default function SuperAdminDashboard() {
  const [data, setData] = React.useState<SuperData | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(ENDPOINT, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed to load dashboard."));
      const json = (await res.json()) as Partial<SuperData>;

      // Defensive defaults to avoid NaN/undefined UI
      const safe: SuperData = {
        tenants: Number(json.tenants ?? 0),
        uptime: String(json.uptime ?? "—"),
        errors24h: Number(json.errors24h ?? 0),
      };
      setData(safe);
    } catch (err: any) {
      setError(err?.message || "Failed to load dashboard.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Super Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground">Tenants, uptime, and error rates at a glance.</p>
        </div>

        <button
          type="button"
          onClick={load}
          className={cn(
            "h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm",
            "hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          )}
          aria-label="Refresh dashboard"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {/* Error banner */}
      {error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
        >
          {error}
        </div>
      )}

      {/* Metrics */}
      {!data && !error ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard title="Tenants" value={data?.tenants ?? 0} />
          <MetricCard title="Uptime" value={data?.uptime ?? "—"} valueClass="text-base" />
          <MetricCard title="Errors (24h)" value={data?.errors24h ?? 0} />
        </div>
      )}
    </section>
  );
}

function MetricCard({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className={cn("mt-1 font-semibold tabular-nums", typeof value === "number" ? "text-2xl" : "text-lg", valueClass)}>
        {value}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="h-4 w-28 animate-pulse rounded bg-black/10 dark:bg-white/10" />
      <div className="mt-3 h-7 w-16 animate-pulse rounded bg-black/10 dark:bg-white/10" />
    </div>
  );
}
