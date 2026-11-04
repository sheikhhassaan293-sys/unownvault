# UnownVault

Next.js (App Router) + TypeScript + Tailwind + Framer Motion. Phase 1 is a front-end demo; see `REVIEW.md` for what's real and what's mocked.

```bash
npm install
npm run dev
```

- `data/content.ts`: all content (mock, shaped like the DB)
- `lib/data.ts`: data layer, the only file that changes when Supabase is wired in
- `lib/themes.ts`: theme tokens
- `components/background/scenes.ts`: animated backgrounds
