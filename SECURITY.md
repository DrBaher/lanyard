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

- **The access gate is the boundary.** `proxy.ts` enforces HTTP Basic Auth at
  the edge before any page, bundle, or data is served. It **fails closed**: with
  no `APP_ACCESS_PASSWORD` set, every request returns HTTP 503. A client-side
  check would *not* be enough — the gate must run server-side, which is why this
  app can't be deployed as a static export.
- **Keep secrets out of the repo.** `APP_ACCESS_PASSWORD`, `ANTHROPIC_API_KEY`,
  etc. belong in your host's environment (and `.env.local`, which is
  git-ignored). Never commit them. The access password is shipped to nobody —
  it's checked server-side only.
- **Personal data stays on the device.** Contacts collected in **Meet** live in
  the browser's `localStorage`, never on a server.
- **Only use data you have the right to use.** Loading a third party's content
  or attendees' personal data can create copyright/privacy exposure regardless
  of the access gate — see
  [Your data, your responsibility](./README.md#your-data-your-responsibility).

## Hardening tips

- Use a strong, unique `APP_ACCESS_PASSWORD`; rotate it after the event.
- Keep the deployment `noindex` (it is by default) so it isn't crawled.
- Prefer a host that terminates HTTPS (required for the camera and PWA anyway).
