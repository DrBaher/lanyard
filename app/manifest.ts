import type { MetadataRoute } from "next";
import { event } from "@/event.config";

// Generated from event.config.ts so the installed-app name/branding follow
// your configuration. Served at /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${event.name} Companion`,
    short_name: event.shortName,
    description: `Time-aware agenda, speakers, companies, and networking for ${event.name}.`,
    start_url: "/",
    display: "standalone",
    background_color: "#0b1020",
    theme_color: "#0b1020",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
