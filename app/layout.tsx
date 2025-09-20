// app/layout.tsx
// Purpose: Strong, consistent app shell (fonts, color tokens, header/footer).
// Fixes: hydration warnings, inconsistent typography, and layout jitter.
// Notes:
// - Relies on a system font stack defined in app/globals.css to avoid network
//   fetches during builds.
// - Applies semantic classes bound to HSL tokens defined in globals.css.
// - Keeps markup minimal and accessible.

import type { Metadata } from "next";
import "./globals.css";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "VEA Portal",
  description: "Victory Educational Academy – School Management Portal",
  applicationName: "VEA Portal",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/* App Header */}
        <header
          className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
          role="banner"
        >
          <div className="container flex h-14 items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-[hsl(var(--brand))]" />
              <span className="text-sm font-semibold tracking-tight">VEA Portal</span>
            </div>
            {/* Placeholder for future nav/actions */}
            <nav aria-label="Global" className="text-sm text-muted-foreground">
              {/* Add <Link> items here when ready */}
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main id="content" role="main" className="container py-6">
          {children}
        </main>

        {/* Footer */}
        <footer role="contentinfo" className="border-t">
          <div className="container py-8 text-sm text-muted-foreground">
            © {new Date().getFullYear()} Victory Educational Academy. All rights reserved.
          </div>
        </footer>

        <Toaster />
      </body>
    </html>
  );
}
