// components/ui/input.tsx
// Purpose: Stable, accessible Input with consistent focus/hover/disabled and optional error state.
// Fixes:
// - Inconsistent borders and focus styles
// - No clear invalid/error appearance
// - Conflicting Tailwind classes across usages
//
// Dependencies: relies on `cn` from lib/utils.ts (clsx + tailwind-merge)

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** If true, styles the input to indicate a validation error. */
  error?: boolean;
  /** Optional text for aria-invalid description (screen readers). */
  errorMessage?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", error = false, errorMessage, ...props },
  ref
) {
  const invalid = Boolean(error);
  const describedBy = invalid && errorMessage ? "input-error" : undefined;

  return (
    <div className="grid gap-1">
      <input
        ref={ref}
        type={type}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          // Base
          "h-10 w-full rounded-xl bg-white px-3 text-sm shadow-sm",
          // Text & placeholder
          "text-foreground placeholder:text-muted-foreground",
          // Borders
          "border border-[hsl(var(--input))]",
          // Hover / focus
          "hover:border-[hsl(var(--border))]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]",
          // Disabled
          "disabled:cursor-not-allowed disabled:opacity-50",
          // Error state (overrides)
          invalid && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        {...props}
      />

      {invalid && errorMessage && (
        <p id="input-error" className="text-xs text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
});
