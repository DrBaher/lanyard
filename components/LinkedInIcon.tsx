/** Official LinkedIn brand mark — used wherever we link to a profile. */
export function LinkedInIcon({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" focusable="false">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        fill="#fff"
        d="M7.2 9.5H4.6V18h2.6V9.5zM5.9 8.34a1.51 1.51 0 1 0 0-3.02 1.51 1.51 0 0 0 0 3.02zM18.4 18h-2.6v-4.15c0-1.04-.02-2.38-1.45-2.38-1.45 0-1.67 1.13-1.67 2.3V18h-2.6V9.5h2.5v1.16h.03c.35-.66 1.2-1.36 2.48-1.36 2.65 0 3.14 1.74 3.14 4.01V18z"
      />
    </svg>
  );
}
