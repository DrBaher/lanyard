import { NextResponse, type NextRequest } from "next/server";
import { event } from "@/event.config";

/**
 * Real, server-side access gate. Runs at the edge before any response is sent,
 * so the actual content — pages, JS bundles and the bundled program data — is
 * withheld from anyone without the credentials. That's what makes this a
 * genuinely private tool rather than a public site with a hidden UI.
 *
 * Set APP_ACCESS_USER / APP_ACCESS_PASSWORD in the environment (Vercel →
 * Project → Settings → Environment Variables). These are server-only secrets
 * and are never shipped to the browser bundle.
 *
 * Fails closed: if APP_ACCESS_PASSWORD is not set, the app stays locked rather
 * than silently going public — UNLESS APP_ALLOW_PUBLIC is explicitly set
 * (e.g. for a public demo deployment), which disables the gate entirely.
 */
const ALLOW_PUBLIC = /^(1|true|yes)$/i.test(process.env.APP_ALLOW_PUBLIC || "");
const USER = process.env.APP_ACCESS_USER || "guest";
const PASSWORD = process.env.APP_ACCESS_PASSWORD || "";
const REALM = `${event.shortName} Companion`;

function challenge(message: string, status = 401) {
  return new NextResponse(message, {
    status,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export function proxy(req: NextRequest) {
  // Explicitly-opened deployment (e.g. the public demo): no gate.
  if (ALLOW_PUBLIC) return NextResponse.next();
  if (!PASSWORD) {
    // Misconfiguration guard — never serve the app wide open by accident.
    return challenge("Access gate not configured. Set APP_ACCESS_PASSWORD.", 503);
  }
  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const [user, pass] = atob(header.slice(6)).split(":");
      if (user === USER && pass === PASSWORD) return NextResponse.next();
    } catch {
      /* malformed header → fall through to challenge */
    }
  }
  return challenge("Authentication required.");
}

export const config = {
  // Gate everything — including /_next/static, where the program data is
  // bundled — except the PWA shell files needed to install and the icon.
  matcher: ["/((?!manifest\\.webmanifest|sw\\.js|icon\\.svg|icon-192\\.png|icon-512\\.png).*)"],
};
