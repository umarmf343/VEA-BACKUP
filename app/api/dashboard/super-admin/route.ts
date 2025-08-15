// app/api/dashboard/super-admin/route.ts
// Purpose: Return super-admin overview metrics.
// Used by: components/super-admin-dashboard.tsx (GET /api/dashboard/super-admin)
//
// Behavior (dev/mock):
// - tenants: total number of tenant orgs
// - uptime:  percentage over last 30 days using mock outage windows
// - errors24h: count of logged errors in the last 24 hours
//
// Production:
// - Replace the ensure*() mocks with real persistence/observability sources.

import { NextResponse } from "next/server";

type Tenant = {
  id: string;
  name: string;
  domain: string;
  status: "active" | "suspended";
  createdAt: string; // ISO
};

type Outage = {
  start: string; // ISO
  end: string;   // ISO
};

type ErrorLog = {
  id: string;
  at: string;    // ISO
  level: "error" | "warn";
  message: string;
};

function ensureTenants(): Tenant[] {
  const g = globalThis as unknown as { _TENANTS?: Tenant[] };
  if (!g._TENANTS) {
    const now = Date.now();
    g._TENANTS = [
      { id: "t_001", name: "Victory Educational Academy", domain: "vea.example", status: "active", createdAt: new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString() },
      { id: "t_002", name: "Springfield High",            domain: "shs.example", status: "active", createdAt: new Date(now - 90  * 24 * 60 * 60 * 1000).toISOString() },
      { id: "t_003", name: "Lagos Grammar",               domain: "lg.example",  status: "active", createdAt: new Date(now - 45  * 24 * 60 * 60 * 1000).toISOString() },
    ];
  }
  return g._TENANTS!;
}

function ensureOutages(): Outage[] {
  const g = globalThis as unknown as { _OUTAGES?: Outage[] };
  if (!g._OUTAGES) {
    const now = Date.now();
    // Mock: a few short outages over the last month
    g._OUTAGES = [
      { start: new Date(now - 7  * 24 * 60 * 60 * 1000 +  2 * 60 * 60 * 1000).toISOString(), end: new Date(now - 7  * 24 * 60 * 60 * 1000 + 2.5 * 60 * 60 * 1000).toISOString() }, // 30m
      { start: new Date(now - 19 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000).toISOString(), end: new Date(now - 19 * 24 * 60 * 60 * 1000 + 5.25 * 60 * 60 * 1000).toISOString() }, // 15m
      { start: new Date(now - 27 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000).toISOString(), end: new Date(now - 27 * 24 * 60 * 60 * 1000 + 9.17 * 60 * 60 * 1000).toISOString() }, // 10m
    ];
  }
  return g._OUTAGES!;
}

function ensureErrors(): ErrorLog[] {
  const g = globalThis as unknown as { _ERRORS?: ErrorLog[] };
  if (!g._ERRORS) {
    const now = Date.now();
    g._ERRORS = [
      { id: "e_001", at: new Date(now - 21 * 60 * 60 * 1000).toISOString(), level: "error", message: "Payment webhook retry" },
      { id: "e_002", at: new Date(now - 25 * 60 * 60 * 1000).toISOString(), level: "warn",  message: "Slow DB query" },
      { id: "e_003", at: new Date(now -  3 * 60 * 60 * 1000).toISOString(), level: "error", message: "Upload service timeout" },
    ];
  }
  return g._ERRORS!;
}

function calcUptimeLast30d(outages: Outage[]): string {
  const end = Date.now();
  const start = end - 30 * 24 * 60 * 60 * 1000;
  const total = end - start;

  let downMs = 0;
  for (const o of outages) {
    const s = Math.max(Date.parse(o.start), start);
    const e = Math.min(Date.parse(o.end), end);
    if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
      downMs += e - s;
    }
  }

  const upPct = Math.max(0, Math.min(100, (1 - downMs / total) * 100));
  return `${upPct.toFixed(2)}%`;
}

export async function GET() {
  const tenants = ensureTenants();
  const outages = ensureOutages();
  const errors = ensureErrors();

  const uptime = calcUptimeLast30d(outages);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const errors24h = errors.filter((e) => Date.parse(e.at) >= cutoff && e.level === "error").length;

  return NextResponse.json(
    { tenants: tenants.length, uptime, errors24h },
    { status: 200 }
  );
}
