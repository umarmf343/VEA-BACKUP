// components/payment-modal.tsx
// Purpose: Reliable Paystack payment initialization with accessible UI.
// Fixes addressed:
// - onClick/onSubmit not firing due to missing "use client" and event handling
// - No validation for amount, empty submissions
// - No consistent loading/disabled state
// - Missing accessible focus management for the dialog
//
// How it works:
// - Renders a "Pay School Fees" button. Clicking opens a simple modal.
// - User enters an amount (₦). We validate it's >= 100.
// - Calls POST /api/payments/initialize { studentId, amount }.
// - If response returns `authorization_url`, we redirect the browser there.
// - Errors are surfaced inline; focus moves to the alert region.
//
// Dependencies: uses <Button> and <Input> from components/ui, and cn() from lib/utils.ts.

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Props = {
  /** Current student's ID (required by your backend) */
  studentId: string;
  /** Optional className for the trigger button wrapper */
  className?: string;
  /** Optional: called when modal closes (e.g., after success or cancel) */
  onClose?: () => void;
};

type InitResponse = {
  authorization_url?: string;
  reference?: string;
  message?: string;
};

const API = {
  initialize: "/api/payments/initialize",
};

export default function PaymentModal({ studentId, className, onClose }: Props) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState<string>("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const alertRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  function openModal() {
    setOpen(true);
    setError(null);
    // Focus the amount field shortly after open
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeModal() {
    setOpen(false);
    setAmount("");
    setError(null);
    onClose?.();
  }

  async function onPay() {
    setError(null);

    // Validate amount (min ₦100 to avoid accidental tiny charges)
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 100) {
      setError("Please enter a valid amount (₦100 or more).");
      requestAnimationFrame(() => alertRef.current?.focus());
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API.initialize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount: value }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Failed to initialize payment.");
      }

      const data = (await res.json()) as InitResponse;

      if (data?.authorization_url) {
        // Redirect to Paystack authorization page
        window.location.href = data.authorization_url;
        return;
      }

      // If no URL returned, show a readable message
      throw new Error(
        data?.message || "Payment initialization did not return an authorization URL."
      );
    } catch (err: any) {
      const msg = err?.message || "Payment failed to initialize.";
      setError(msg);
      requestAnimationFrame(() => alertRef.current?.focus());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn(className)}>
      {!open ? (
        <Button onClick={openModal} type="button">
          Pay School Fees
        </Button>
      ) : (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Make a Payment"
          className="fixed inset-0 z-[100] grid place-items-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="relative z-[101] w-full max-w-md rounded-2xl border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Make a Payment</h2>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl px-2 py-1 text-sm text-muted-foreground hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2"
                aria-label="Close payment modal"
              >
                Close
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div
                ref={alertRef}
                role="alert"
                tabIndex={-1}
                className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
              >
                {error}
              </div>
            )}

            {/* Amount input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="amount">
                Amount (₦)
              </label>
              <Input
                id="amount"
                ref={inputRef}
                name="amount"
                type="number"
                inputMode="numeric"
                min={100}
                step="50"
                placeholder="e.g., 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="amount-help"
                required
              />
              <p id="amount-help" className="text-xs text-muted-foreground">
                Enter the amount in Nigerian Naira (minimum ₦100).
              </p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeModal} disabled={loading}>
                Cancel
              </Button>
              <Button type="button" onClick={onPay} isLoading={loading} disabled={loading}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
