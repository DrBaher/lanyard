# Security Policy

## Reporting a vulnerability

Please report security issues **privately** — do not open a public issue.

- Preferred: GitHub → the repository's **Security** tab → **Report a
  vulnerability** (private advisory).
- Otherwise, contact the repository owner directly.

Please include a description, reproduction steps, and the impact. We'll
acknowledge promptly and keep you updated on a fix.

## Supported versions

This is a template; security fixes land on `main`. If you've deployed a fork,
pull the latest `main` to pick them up.

## Security model — what to know when you deploy

- **The deployment is public.** The app ships with no built-in access control —
  anyone with the URL can open it, including the bundled program data. If you
  need to restrict access, add protection at the host level (e.g. Vercel
  Deployment Protection, a reverse proxy with HTTP auth, or an SSO/WAF in
  front). Don't deploy data you aren't comfortable serving publicly.
- **Keep secrets out of the repo.** `ANTHROPIC_API_KEY` and similar secrets
  belong in your host's environment (and `.env.local`, which is git-ignored).
  Never commit them; they're used server-side only and shipped to nobody.
- **Personal data stays on the device.** Contacts collected in **Meet** live in
  the browser's `localStorage`, never on a server.
- **Only use data you have the right to use.** Loading a third party's content
  or attendees' personal data can create copyright/privacy exposure, especially
  on a public deployment — see
  [Your data, your responsibility](./README.md#your-data-your-responsibility).

## Hardening tips

- If access needs to be limited, put host-level protection in front (see above)
  rather than relying on the app.
- Keep the deployment `noindex` (it is by default) so it isn't crawled.
- Prefer a host that terminates HTTPS (required for the camera and PWA anyway).
