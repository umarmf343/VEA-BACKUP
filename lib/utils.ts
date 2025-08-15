// lib/utils.ts
// Purpose: Reliable, deterministic className composition for Tailwind.
// Problem addressed: v0.dev often concatenates classes in ways that
// cause Tailwind conflicts (e.g., multiple padding/rounded/text classes).
// Solution: Use `clsx` to conditionally build class lists, then `tailwind-merge`
// to dedupe/resolve conflicts in Tailwind order, producing a stable final string.

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn(...inputs)
 * - Accepts strings, arrays, objects (truthy keys only), or nested combinations.
 * - Returns a single Tailwind-merged string with duplicates/conflicts removed.
 *
 * Examples:
 *   cn("px-2", false && "hidden", ["py-2", { "rounded-xl": isCard }], "px-4")
 *   -> "py-2 rounded-xl px-4"   // px-2 was overridden by px-4, hidden was falsy
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * cx(base, conditional, ...extras)
 * Convenience wrapper when you want a clear "base + overrides" pattern.
 * This helps standardize how UI components compose their classNames.
 */
export function cx(base: ClassValue, ...rest: ClassValue[]) {
  return cn(base, ...rest);
}

/**
 * compose<T>(...fns)
 * Small functional helper used by some UI kits to compose className transformers
 * or small prop mappers. Included for compatibility and future-proofing.
 */
export function compose<T>(...fns: Array<(arg: T) => T>) {
  return (arg: T) => fns.reduce((acc, fn) => fn(acc), arg);
}
