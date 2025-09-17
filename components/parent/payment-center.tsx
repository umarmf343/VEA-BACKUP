"use client";

import * as React from "react";

type Payment = {
  id: string;
  studentId: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  processedAt: string;
  notes?: string;
};

type Account = {
  id: string;
  studentId: string;
  planType: string;
  balance: number;
  scholarshipPercentage: number;
  lastPaymentDate: string;
  upcomingDueDate: string;
  payments: Payment[];
};

type Student = {
  id: string;
  name: string;
};

const PAYMENT_METHODS = [
  { value: "bank-transfer", label: "Bank transfer" },
  { value: "card", label: "Debit card" },
  { value: "cash", label: "Cash" },
];

export function ParentPaymentCenter() {
  const [accounts, setAccounts] = React.useState<Account[]>([]);
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ studentId: "", amount: "", method: PAYMENT_METHODS[0]?.value ?? "bank-transfer", notes: "" });
  const [submitting, setSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, studentsRes] = await Promise.all([
        fetch("/api/parent/financials", { cache: "no-store" }),
        fetch("/api/parent/students", { cache: "no-store" }),
      ]);
      if (!accountsRes.ok) throw new Error(await accountsRes.text().catch(() => "Unable to load financials."));
      if (!studentsRes.ok) throw new Error(await studentsRes.text().catch(() => "Unable to load students."));
      const accountsJson = await accountsRes.json();
      const studentsJson = await studentsRes.json();
      setAccounts(accountsJson.accounts ?? []);
      setStudents(studentsJson.students ?? []);
      if (!form.studentId && studentsJson.students?.length) {
        setForm((prev) => ({ ...prev, studentId: studentsJson.students[0].id }));
      }
    } catch (err: any) {
      setError(err?.message ?? "Unable to load financial data.");
    } finally {
      setLoading(false);
    }
  }, [form.studentId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const submit = React.useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.studentId || !form.amount) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/parent/financials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: form.studentId,
          amount: Number(form.amount),
          method: form.method,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Unable to process payment."));
      const payment = await res.json();
      setMessage(`Payment reference ${payment.reference} logged successfully.`);
      setForm((prev) => ({ ...prev, amount: "", notes: "" }));
      load();
    } catch (err: any) {
      setError(err?.message ?? "Unable to process payment.");
    } finally {
      setSubmitting(false);
    }
  }, [form, load]);

  const studentName = React.useCallback(
    (studentId: string) => students.find((student) => student.id === studentId)?.name ?? "Unknown",
    [students]
  );

  return (
    <section className="rounded-3xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Payments & balances</h2>
          <p className="text-sm text-muted-foreground">
            View outstanding balances, scholarships, and log payments right from the guardian portal.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="h-10 rounded-xl border border-[hsl(var(--input))] bg-white px-3 text-sm"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,1fr]">
        <form onSubmit={submit} className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-semibold">Log a payment</h3>
          <p className="mt-1 text-sm text-muted-foreground">Record transfers made via bank, card, or cash.</p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-foreground">
              Student
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.studentId}
                onChange={(event) => setForm((prev) => ({ ...prev, studentId: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select a student
                </option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Amount (₦)
              <input
                type="number"
                min="0"
                step="1000"
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                required
              />
            </label>

            <label className="block text-sm font-medium text-foreground">
              Method
              <select
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.method}
                onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value }))}
              >
                {PAYMENT_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Notes
              <textarea
                className="mt-1 w-full rounded-lg border border-input bg-background p-2 text-sm"
                value={form.notes}
                rows={3}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                placeholder="Optional reference, bank teller, etc."
              />
            </label>
          </div>

          <button
            type="submit"
            className="mt-6 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
            disabled={submitting}
          >
            {submitting ? "Logging payment…" : "Log payment"}
          </button>
        </form>

        <div className="space-y-5">
          {accounts.map((account) => (
            <article key={account.id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold">{studentName(account.studentId)}</h3>
                  <p className="text-xs uppercase text-muted-foreground">{account.planType} plan</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-muted-foreground">Outstanding</p>
                  <p className="text-lg font-semibold text-foreground">₦{Math.round(account.balance).toLocaleString("en-NG")}</p>
                </div>
              </header>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-xl border bg-muted/40 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Scholarship</dt>
                  <dd className="text-base font-semibold">{account.scholarshipPercentage}%</dd>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Next due</dt>
                  <dd className="text-base font-semibold">
                    {new Date(account.upcomingDueDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </dd>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Last payment</dt>
                  <dd className="text-base font-semibold">
                    {new Date(account.lastPaymentDate).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </dd>
                </div>
                <div className="rounded-xl border bg-muted/40 p-3">
                  <dt className="text-xs uppercase text-muted-foreground">Recent receipt</dt>
                  <dd className="text-base font-semibold">
                    {account.payments[account.payments.length - 1]?.reference ?? "—"}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <h4 className="text-sm font-semibold">Payment history</h4>
                <ul className="mt-2 space-y-2 text-sm">
                  {account.payments.map((payment) => (
                    <li key={payment.id} className="rounded-lg border border-dashed p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">₦{Math.round(payment.amount).toLocaleString("en-NG")}</span>
                        <span className="text-xs uppercase text-muted-foreground">{payment.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(payment.processedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Ref: {payment.reference}</p>
                      {payment.notes && <p className="mt-1 text-xs text-muted-foreground">{payment.notes}</p>}
                    </li>
                  ))}
                  {!account.payments.length && (
                    <li className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                      No payments logged yet.
                    </li>
                  )}
                </ul>
              </div>
            </article>
          ))}

          {!accounts.length && !loading && (
            <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No financial accounts linked to this guardian profile.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
