// app/error.tsx
// Global error boundary for the App Router.
// This MUST be a Client Component. It catches render/async errors in route segments
// and shows a friendly, accessible fallback with a retry button.

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { error, reset } = props;

  React.useEffect(() => {
    // Optional: log to your telemetry here
    // console.error("Route error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <section className="mx-auto grid min-h-[60dvh] w-full max-w-2xl place-items-center p-6">
          <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
            <h1 className="text-lg font-semibold">Something went wrong</h1>

            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error?.message || "An unexpected error occurred."}
              {error?.digest ? (
                <div className="mt-1 text-xs opacity-80">Ref: {error.digest}</div>
              ) : null}
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={reset}>Try again</Button>
              <Button
                variant="secondary"
                onClick={() => (window.location.href = "/")}
              >
                Go home
              </Button>
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              If this keeps happening, contact support with the reference code above.
            </p>
          </div>
        </section>
      </body>
    </html>
  );
}
