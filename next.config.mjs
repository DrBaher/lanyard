// Content-Security-Policy tuned to what the app actually needs:
//  - script: inline (Next bootstrap) + wasm (Tesseract OCR runs WebAssembly)
//  - worker blob: (Tesseract + service worker spin up blob workers)
//  - img https/data/blob: (remote logos, generated QR canvases, initial avatars)
//  - connect https/wss: (Supabase magic-link + realtime, same-origin /api)
// Camera (QR/OCR) is granted via Permissions-Policy, not CSP.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  // data: — Tesseract.js fetches its WASM binary as a data: URL.
  "connect-src 'self' https: wss: data:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "media-src 'self' blob:",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), browsing-topics=()",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode is always on in Next.js 16 — no longer configurable.
  // We intentionally avoid next/image (plain <img>) so the app degrades
  // gracefully offline and can reference remote speaker/company logos.
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
