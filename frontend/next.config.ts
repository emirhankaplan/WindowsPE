import type { NextConfig } from 'next';

const securityHeaders = [
  // Prevent MIME-type sniffing.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Block framing entirely — this is a single-page tool, not an embed target.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Only send the origin (no path/query) as the Referer on cross-origin requests.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Block Flash / PDF cross-domain policies.
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
  // Prevent browsers from doing DNS prefetch on cross-origin links inside the
  // app (MITRE / HackTricks / blog URLs). Reduces information leakage.
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  // Permissions policy — deny all powerful features this app doesn't need.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The Rust backend lives on a separate origin in production; in dev we
  // hit it directly via NEXT_PUBLIC_API_BASE_URL set in `.env.local`.
  //
  // `typedRoutes` was on in Step A but dynamic `/node/[id]` template-literal
  // pushes require `as Route` casts everywhere, which is friction we don't
  // need for a small, mostly-internal route surface.
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
