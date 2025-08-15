// app/layout.tsx
// ------------------------------------------------------------
// Purpose:
// - Provide a stable, accessible, and consistent shell for the app.
// - Fix hydration warnings by aligning client/server markup.
// - Apply global font and design tokens once at the root.
// - Ensure predictable spacing, layout, and header/footer structure.
//
// Notes:
// - Uses next/font to load Inter with "swap" for good CLS scores.
// - Adds `suppressHydrationWarning` on <html> to prevent false positives
//   when CSS variables or color scheme differ between SSR and client.
// - Enforces a max content width, consistent paddings, and a sticky header.
// - Uses semantic landmarks: header, main, footer.
// - All classNames rely on tokens defined in app/globals.css.
//
// Compatible with Next.js App Router.
// ------------------------------------------------------------

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ReactNode } from "react";
import { Inter } from "next/font/google";

// Load a single global font (avoid multiple competing families).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",            // prevents FOIT and reduces CLS
  variable: "--font-inter",   // exposes a CSS var to use in globals
});

// SEO + sharing defaults (adjust title/description later if needed).
export const metadata: Metadata = {
  title: "VEA Portal",
  description: "Victory Educational Academy – School Management Portal",
  applicationName: "VEA Portal",
  manifest: "/site.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  // Open Graph defaults (safe fallbacks).
  openGraph: {
    type: "website",
    title: "VEA Portal",
    description: "Victory Educational Academy – School Management Portal",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://portal.example.com",
    siteName: "VEA Portal",
  },
  // Basic robots config; adjust if you need to block staging.
  robots: { index: true, follow: true },
};

// Mobile-friendly viewport & theme color hooks into CSS tokens.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(221 83% 53%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(221 83% 66%)" },
  ],
};

// Centralized container utility to keep page width consistent.
function Container({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4">{children}</div>;
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // `suppressHydrationWarning` prevents noisy warnings when CSS variables
    // (e.g., color scheme) differ between SSR and client on first paint.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      {/* The body uses semantic tokens from globals.css (bg/text). */}
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {/* Skip link for keyboard users & screen readers */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 rounded-md bg-card px-3 py-2 text-sm shadow"
        >
          Skip to main content
        </a>

        {/* Sticky, translucent header to preserve vertical rhythm */}
        <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur">
          <Container>
            <div className="h-14 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Brand mark could be an <Image> if available */}
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[hsl(var(--brand))] text-white text-xs font-bold">
                  V
                </span>
                <span className="text-sm font-semibold tracking-tight">VEA Portal</span>
              </div>

              {/* Right side placeholder for auth/user menu */}
              <nav aria-label="Global" className="flex items-center gap-3">
                {/* Convert these placeholders to actual links/actions later */}
                <button
                  className="h-9 rounded-xl px-3 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2"
                  aria-label="Open notifications"
                >
                  Notifications
                </button>
                <button
                  className="h-9 rounded-xl px-3 text-sm hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2"
                  aria-label="Open user menu"
                >
                  Account
                </button>
              </nav>
            </div>
          </Container>
        </header>

        {/* Main content area */}
        <main id="main">
          <Container>
            {/* Standardized vertical spacing for page sections */}
            <div className="py-6">{children}</div>
          </Container>
        </main>

        {/* Footer mirrors header spacing; muted color for hierarchy */}
        <footer className="border-t">
          <Container>
            <div className="py-10 text-sm text-muted-foreground">
              © {new Date().getFullYear()} Victory Educational Academy
            </div>
          </Container>
        </footer>
      </body>
    </html>
  );
}
