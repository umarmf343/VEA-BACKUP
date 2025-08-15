// next.config.mjs
// Purpose: Stabilize production build/runtime & add safe security headers.
// Notes:
// - `reactStrictMode` helps catch UI issues in dev.
// - Security headers are applied to all routes.
// - CSP is permissive enough for typical third-party POST/redirects (e.g., Paystack).

const CONTENT_SECURITY_POLICY = `
  default-src 'self';
  script-src 'self' https: 'unsafe-inline';
  style-src 'self' https: 'unsafe-inline';
  img-src 'self' data: blob: https:;
  font-src 'self' https: data:;
  connect-src 'self' https:;
  frame-src https:;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self' https:;
`.replace(/\s{2,}/g, " ").trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  swcMinify: true,
  compress: true,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
