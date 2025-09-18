// components/ui/button.tsx
// Purpose: Consistent, accessible Button component with variants, sizes, and loading state.
// Fixes:
// - Inconsistent hover/active/focus behavior
// - Missing disabled semantics
// - Duplicated/conflicting Tailwind classes
// - No clear loading UX
//
// Dependencies: relies on `cn` from lib/utils.ts (which uses clsx + tailwind-merge).
// Usage examples:
//   <Button>Save</Button>
//   <Button variant="secondary" size="lg">Download</Button>
//   <Button isLoading>Submitting…</Button>

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const base =
  // layout
  "inline-flex items-center justify-center gap-2 rounded-2xl font-medium transition-colors select-none " +
  // sizing is applied per-size map
  // colors/hover are applied per-variant map
  // accessibility
  "focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 " +
  // motion-friendly
  "active:scale-[.99]";

const variants: Record<Variant, string> = {
  primary:
    "bg-[hsl(var(--brand))] text-white hover:opacity-90 focus-visible:ring-[hsl(var(--ring))]",
  secondary:
    "bg-[hsl(var(--muted))] text-foreground hover:opacity-95 focus-visible:ring-[hsl(var(--ring))]",
  ghost:
    "bg-transparent text-foreground hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-[hsl(var(--ring))]",
  outline:
    "bg-transparent text-foreground border border-[hsl(var(--border))] hover:bg-black/5 dark:hover:bg-white/10 focus-visible:ring-[hsl(var(--ring))]",
  destructive:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10 p-0", // square button for icon-only actions
};

export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        aria-busy={isLoading || undefined}
        aria-disabled={isDisabled || undefined}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner (accessible, minimal) */}
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}
        <span>{children}</span>
      </button>
    );
  }
);

Button.displayName = "Button";
