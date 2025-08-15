// components/admin/payment-management.tsx
// Purpose: Reliable admin payment controls (list -> verify -> mark paid).
// Fixes addressed:
// - Broken onClick handlers (missing "use client", stale state issues)
// - No per-row loading state (double submissions, race conditions)
// - No error surfacing or accessible feedback
// - Inconsistent formatting for currency and status
//
// Expected API (adjust endpoints if your routes differ):
//   GET  /api/payments                       -> Payment[]
//   POST /api/payments/verify      { id }    -> 200 OK
//   POST /api/payments/mark-paid   { id }    -> 200 OK
//
// UI behavior:
// - Loads payments on mount and on demand via "Refresh".
// - Each row has Verify and Mark Paid actions (disabled while busy).
// - Shows an error banner if a request fails, focusing it for screen readers.
//
// Dependencies: <Button> from components/ui/button, cn() from lib/utils.

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "pending" | "paid" | "failed";

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  status: Status;
  createdAt?: string;
  reference?: string;
};

const API = {
  list: "/api/payments",
  verify: "/api/payments/verify",
  markPaid: "/api/payments/mark-paid",
};

/** Format amount as Nigerian Naira (fallback to simple format if Intl fails) */
function formatNaira(value: number) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₦${Math.round(value).toLocaleString()}`;
  }
}

export default function PaymentManagement() {
  const [items, setItems] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(false); // list loading
  const [busyId, setBusyId] = React.useState<string | null>(null); // per-row action
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);
  const [filter, setFilter] = React.useState<Status | "all">("all");

  const filtered = React.useMemo(
    () => (filter === "all" ? items : items.filter((p) => p.status === filter)),
    [items, filter]
  );

  async function refresh() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(API.list, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text().catch(() => "Failed to load payments."));
      const data = (await res.json()) as Payment[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load payments.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doAction(endpoint: string, id: string) {
    setError(null);
    setBusyId(id);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Request failed."));
      await refresh();
    } catch (err: any) {
      setError(err?.message || "Action failed.");
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setBusyId(null);
    }
  }

  function statusBadge(s: Status) {
    const base =
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";
    if (s === "paid") return <span className={cn(base, "bg-green-50 text-green-700 ring-green-200")}>Paid</span>;
    if (s === "pending") return <span className={cn(base, "bg-amber-50 text-amber-700 ring-amber-200")}>Pending</span>;
    return <span className={cn(base, "bg-red-50 text-red-700 ring-red-200")}>Failed</span>;
  }

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Payment Management</h2>
        <div className="flex items-center gap-2">
          {/* Quick filter */}
          <select
            aria-label="Filter by status"
            className="h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
            value={filter}
            onChange={(e) => setFilter(e.target.value as Status | "all")}
            disabled={loading}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>

          <Button variant="secondary" onClick={refresh} disabled={loading} aria-label="Refresh payments">
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

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

      {/* List */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-2 py-1">Student</th>
              <th className="px-2 py-1">Amount</th>
              <th className="px-2 py-1">Status</th>
              <th className="px-2 py-1">Reference</th>
              <th className="px-2 py-1">Created</th>
              <th className="px-2 py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-6 text-center text-sm text-muted-foreground">
                  {loading ? "Loading payments…" : "No payments found."}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const busy = busyId === p.id;
                return (
                  <tr key={p.id} className="rounded-xl border bg-card align-middle">
                    <td className="px-2 py-2">
                      <div className="font-medium">{p.studentId}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{formatNaira(p.amount)}</td>
                    <td className="px-2 py-2">{statusBadge(p.status)}</td>
                    <td className="px-2 py-2">
                      <span className="text-xs text-muted-foreground">{p.reference || "—"}</span>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => doAction(API.verify, p.id)}
                          disabled={busy || p.status === "paid"}
                        >
                          {busy ? "Working…" : "Verify"}
                        </Button>
                        <Button
                          onClick={() => doAction(API.markPaid, p.id)}
                          disabled={busy || p.status === "paid"}
                        >
                          {busy ? "Working…" : "Mark Paid"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
