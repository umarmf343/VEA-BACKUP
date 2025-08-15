// components/ui/form.tsx
// Purpose: Safe, accessible form wrapper with standardized submit handling.
// Fixes:
// - onSubmit not firing reliably (mixed server/client handling)
// - Double submissions and missing loading states
// - No accessible error messaging
// - Inconsistent spacing and focus management
//
// Usage:
// <Form onSubmit={async (data) => { await doSomething(data) }}>
//   <Input name="title" required />
//   <Button type="submit" isLoading={/* optional external state */}>Save</Button>
// </Form>
//
// Notes:
// - This component controls its own "loading" state; it disables inner fields during submit.
// - Throw an Error inside your onSubmit to show an error banner automatically.
// - Set resetOnSuccess to true if you want the form to clear after a successful submit.

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type FormDataObject = Record<string, FormDataEntryValue | FormDataEntryValue[]>;

export interface FormProps
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> {
  /**
   * Submit handler. Return/await a Promise to keep the built-in loading state active.
   * Throw an Error or reject the Promise to display an error banner.
   */
  onSubmit: (data: FormDataObject, event: React.FormEvent<HTMLFormElement>) => Promise<void> | void;
  /** Reset inputs after a successful submit (default: false). */
  resetOnSuccess?: boolean;
  /** Optional external loading to merge with internal state. */
  busy?: boolean;
  /** Show a top error banner (default true). */
  showErrorBanner?: boolean;
  /** ClassName for the inner <fieldset>. */
  fieldsetClassName?: string;
}

/** Convert FormData to a plain object, grouping multiple entries per key. */
function formDataToObject(fd: FormData): FormDataObject {
  const obj: FormDataObject = {};
  for (const [key, value] of fd.entries()) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const current = obj[key];
      if (Array.isArray(current)) current.push(value);
      else obj[key] = [current, value];
    } else {
      obj[key] = value;
    }
  }
  return obj;
}

export function Form({
  className,
  fieldsetClassName,
  onSubmit,
  resetOnSuccess = false,
  busy = false,
  showErrorBanner = true,
  children,
  ...rest
}: FormProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const isBusy = submitting || busy;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isBusy) return;

    setError(null);
    setSubmitting(true);

    const fd = new FormData(e.currentTarget);
    const data = formDataToObject(fd);

    try {
      await onSubmit(data, e);
      if (resetOnSuccess) {
        // Reset the form after successful submission
        e.currentTarget.reset();
      }
    } catch (err: any) {
      // Normalize error message
      const msg =
        (err && (err.message || err.toString())) ||
        "Submission failed. Please try again.";
      setError(String(msg));
      // Move focus to banner for accessibility
      requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLDivElement>("[role='alert']")?.focus();
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      ref={formRef}
      className={cn("space-y-3", className)}
      onSubmit={handleSubmit}
      data-loading={isBusy || undefined}
      {...rest}
    >
      {showErrorBanner && error && (
        <div
          role="alert"
          tabIndex={-1}
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 outline-none"
        >
          {error}
        </div>
      )}

      <fieldset
        disabled={isBusy}
        className={cn(
          // Keep inner spacing consistent; consumers can override via fieldsetClassName
          "space-y-3 disabled:cursor-not-allowed",
          fieldsetClassName
        )}
      >
        {children}
      </fieldset>
    </form>
  );
}

export default Form;
