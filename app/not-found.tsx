// app/not-found.tsx
// Global 404 page for the App Router (server component by default).
// Keeps styling consistent without importing client-only UI components.

import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto grid min-h-[60dvh] w-full max-w-2xl place-items-center p-6">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>

        <div className="mt-4 flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[hsl(var(--input))] bg-white px-4 text-sm font-medium hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            Go to Home
          </Link>
          <button
            type="button"
            onClick={() => (typeof window !== "undefined" ? window.history.back() : null)}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-transparent bg-[hsl(var(--muted))] px-4 text-sm font-medium text-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]"
          >
            Go Back
          </button>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">Error code: 404</p>
      </div>
    </section>
  );
}
