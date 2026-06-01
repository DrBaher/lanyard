# Contributing

Thanks for considering a contribution! This is a template app, so the most
valuable contributions keep it **generic and reusable** rather than tied to any
one event.

## Good things to work on

- New data importers (e.g. Sessionize API, a plain CSV, other schedule formats).
- Accessibility, performance, and mobile/PWA polish.
- Documentation and examples.
- Bug fixes with a clear repro.

Please **don't** add real event data, scraped third-party content, or anything
event-specific to the committed `data/*.json` — those stay as fictional samples
(see [Your data, your responsibility](./README.md#your-data-your-responsibility)).

## Development setup

```bash
npm install
cp .env.example .env.local        # optional: keys for AI research, etc.
npm run dev                       # http://localhost:3000
```

## Before opening a PR

Please make sure these pass:

```bash
npm run typecheck   # tsc --noEmit
npm test            # vitest
npm run build       # production build
```

- Match the existing code style (TypeScript, Tailwind utility classes, the
  shared `.btn` / `.card` / `.chip` component classes in `app/globals.css`).
- Keep changes focused; one logical change per PR.
- Update the README / docs if you change behaviour or config.
- Add or update tests for logic in `lib/`.

## PR flow

1. Fork and branch from `main`.
2. Make your change with tests.
3. Open a PR describing **what** and **why**, with screenshots for UI changes.

By contributing, you agree your contributions are licensed under the
repository's [MIT License](./LICENSE).
