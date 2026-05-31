# Deploying to Vercel

The repo is configured for zero-config Vercel deployment (`vercel.json`,
`framework: nextjs`, Node pinned to ≥20.9). For why a server-side host is
required and other host options, see the [Deploying section of the
README](./README.md#deploying). Two ways in.

## Option A — Dashboard (recommended, ~2 minutes)

1. Go to <https://vercel.com/new> and **Import** the `DrBaher/lanyard` repo
   (authorize the Vercel GitHub app if prompted). Vercel auto-detects Next.js —
   leave build/output settings at their defaults.
2. Before the first deploy, open **Environment Variables** and add:

   | Name | Value | Notes |
   |---|---|---|
   | `APP_ACCESS_PASSWORD` | *(your secret)* | **Required.** The app's access gate. Server-only — never sent to the browser. The app returns HTTP 503 until this is set. |
   | `APP_ACCESS_USER` | e.g. `guest` | Optional; defaults to `guest`. The username at the login prompt. |
   | `ANTHROPIC_API_KEY` | `sk-ant-…` | Optional. Enables live research; omit to stay in stub mode. **Server-only — never prefix with `NEXT_PUBLIC_`.** |
   | `RESEARCH_MODEL` | `claude-opus-4-8` | Optional override. |
   | `NEXT_PUBLIC_GROUP_CODE` | *(a code)* | Optional. A light abuse guard for `/api/research`; the whole app is already behind the access gate. |

3. **Deploy.** You get an HTTPS URL — required for the camera, OCR, and
   notifications to work on phones. Your browser will prompt for the
   user/password from step 2.

## Option B — CLI

```bash
npm i -g vercel
vercel link          # connect this folder to a Vercel project
vercel env add APP_ACCESS_PASSWORD        # repeat for each var above
vercel --prod        # build + deploy to production
```

## After deploy — test on a real phone

This is the one thing not verifiable in CI. On your phone:

- Open the URL → log in at the browser prompt (the user/password you set).
- **Meet → Scan badge → Read text (OCR)** — grant camera permission, capture a
  badge, confirm the parsed name/company.
- Tap **Research** on a speaker — if `ANTHROPIC_API_KEY` is set you get a live
  brief; otherwise the labelled stub.
- **Now** screen → enable **reminders**, hit "Send a test" to confirm
  notifications fire.
- Add to Home Screen to install the PWA.

## Notes

- **The gate fails closed:** with no `APP_ACCESS_PASSWORD`, every request
  returns HTTP 503. If you see that after deploy, set the variable and redeploy.
- **`/api/research` runs up to 60s** (`vercel.json` → `maxDuration`). On the
  Hobby plan the ceiling is 60s, on Pro 300s — fine either way. If a deploy
  warns about function duration, your plan caps it; lower the value to 10 to be
  safe on the strictest tier.
- **`public/tesseract/` is ~25 MB** (self-hosted OCR worker + English data).
  Well within Vercel limits, and served with a 1-year immutable cache header so
  it downloads once per device.
- Pushes to `main` auto-deploy to production; other branches get preview URLs.
