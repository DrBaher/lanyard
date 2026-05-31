import type { Metadata, Viewport } from "next";
import "./globals.css";
import { EVENT } from "@/lib/event";
import { TimeProvider } from "@/components/TimeProvider";
import { StarsProvider } from "@/components/StarsProvider";
import { RemindersProvider } from "@/components/RemindersProvider";
import { BottomNav } from "@/components/BottomNav";
import { PWA } from "@/components/PWA";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeToggle } from "@/components/ThemeToggle";

// Runs before first paint to set the theme class, so there's no flash of the
// wrong theme. Honours a saved choice, else the OS preference.
const themeScript = `(function(){try{var t=localStorage.getItem('te.theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}document.documentElement.classList.add(t);}catch(e){document.documentElement.classList.add('dark');}})();`;

export const metadata: Metadata = {
  title: `${EVENT.name} Companion`,
  description: `Navigate ${EVENT.name} in ${EVENT.city}: time-aware agenda, speakers, companies, and networking.`,
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: EVENT.name },
  // Private tool — keep it out of search indexes (the Basic Auth gate already
  // blocks crawlers, but this is belt-and-suspenders).
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1020" },
    { media: "(prefers-color-scheme: light)", color: "#f1f5f9" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <PWA />
        <ErrorBoundary>
          <TimeProvider>
            <StarsProvider>
              <RemindersProvider>
                {/* Floating theme switch, aligned to the content column's top-right. */}
                <div className="pointer-events-none fixed inset-x-0 top-0 z-50">
                  <div className="mx-auto flex max-w-2xl justify-end px-4 pt-5">
                    <ThemeToggle />
                  </div>
                </div>
                <main className="mx-auto max-w-2xl px-4 pb-24 pt-5">{children}</main>
                <BottomNav />
              </RemindersProvider>
            </StarsProvider>
          </TimeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
