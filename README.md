# Event Companion

A private, installable (PWA) companion app for a conference or event. Point it
at your own program data and deploy it behind a password in minutes.

It's time-aware (a "happening now / up next" view), works offline, and stores
everything personal — your starred sessions, the people you meet — locally on
the device.

Built with Next.js 16, React 19, and Tailwind. Designed to run on Vercel's free
tier.

## Features

- **Now** — what's live and up next, computed from the current time.
- **Agenda** — full multi-day program with search, topic filters, "my schedule"
  stars, conflict warnings, and one-tap calendar export (`.ics`).
- **Session details** — tap any session for the full abstract, speakers, and a
  link to its page.
- **Speakers & Companies** — browsable, searchable directories with profiles.
- **Search** — across the whole program at once.
- **Meet** — a private, on-device contact list: scan a badge QR or business
  card (on-device OCR), or add people manually; tag them, pin follow-ups to the
  top, and export to CSV or vCard. Nothing leaves the device.
- **Optional AI research** — tap "Research" on a speaker/company/contact to get
  a short, web-searched brief (needs an Anthropic API key; otherwise shows a
  stub).
- **Light & dark** themes, installable to the home screen, offline-friendly.
- **Private by default** — a server-side access gate (HTTP Basic Auth) keeps the
  whole app, including its data, behind a password.

## Quick start

```bash
npm install
cp .env.example .env.local      # then set APP_ACCESS_PASSWORD
npm run dev                     # http://localhost:3000 (you'll be prompted to log in)
```

The repo ships with **sample data** so it runs immediately. Then make it yours:

### 1. Configure your event

Edit [`event.config.ts`](./event.config.ts) — name, short name, tagline, city,
timezone, the list of days, and your website. The timezone must match the UTC
offsets in your session data.

### 2. Add your program data

Replace the files in [`data/`](./data) with your event's content. The shapes
are defined in [`lib/types.ts`](./lib/types.ts):

- `data/sessions.json` — `Session[]` (title, `start`/`end` ISO times **with
  offset**, stage, tags, `speakerIds`, `orgIds`, optional `description` and
  `sourceUrl`).
- `data/speakers.json` — `Speaker[]` (name, title, company, `orgId`, topics,
  bio, optional `photo` URL).
- `data/organizations.json` — `Organization[]` (name, `type`, tagline, website,
  booth, topics).
- `data/research.json` — `{}` to start; AI dossiers (if enabled) are generated
  on demand.

IDs are arbitrary strings but must line up (`speakerIds`/`orgIds` reference the
`id`s in the other files).

### 3. Set the access password

The app is private and stays locked (HTTP 503) until you set a password:

```
APP_ACCESS_USER=guest
APP_ACCESS_PASSWORD=your-secret
```

Set these in `.env.local` for local dev and in your host's environment for
production. Share the user + password with whoever you want to let in.

### 4. Deploy

Push to a Git host and import the project on [Vercel](https://vercel.com). Add
`APP_ACCESS_USER` / `APP_ACCESS_PASSWORD` (and optionally the research keys
below) as Environment Variables, then deploy. The app is gated server-side and
marked `noindex`, so it won't be crawled.

## Optional: AI research

Add `ANTHROPIC_API_KEY` to enable the "Research" buttons (Claude + web search,
server-side). Without it, those buttons show a labelled placeholder. See
`.env.example` for all variables.

## Customising branding

- App icon: replace `public/icon.svg`, `public/icon-192.png`,
  `public/icon-512.png`.
- Theme colours: CSS variables in `app/globals.css` (and `tailwind.config.ts`).
- The PWA manifest is generated from `event.config.ts` in `app/manifest.ts`.

## Your data, your responsibility

This template ships with **fictional sample data**. When you add real program
data, that content is yours to manage:

- Only use data you have the right to use. Scraping a third party's website and
  republishing their content (session abstracts, bios, photos) or their
  attendees' personal data can infringe copyright, breach the site's terms, and
  violate privacy/GDPR — even for a "private" app. If in doubt, ask the
  organiser for permission or use an official feed/API.
- The contact list built via **Meet** is captured with consent (you scan or type
  in someone you actually meet) and is stored only on that device.

The MIT license covers the code in this repository, not any data you add.

## Device notes

- **OCR** runs fully client-side via `tesseract.js`, self-hosted in
  `public/tesseract/` so it works offline.
- **Camera** (QR/OCR badge scanning) requires HTTPS or `localhost`.
- **Reminders** use the Notification API and fire while the app is open (no
  server, so no background push) — install to the home screen for reliability.

## Scripts

```bash
npm run dev         # local dev server
npm run build       # production build
npm run start       # run the production build
npm run typecheck   # tsc --noEmit
npm test            # unit tests (vitest)
npm run e2e         # end-to-end tests (playwright)
```

## License

[MIT](./LICENSE) — code only.
