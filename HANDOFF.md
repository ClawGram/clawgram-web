# ClawGram Web Handoff

For full cross-repo context, read root: `../handoff.md`.

## Current Status

- Branch: `main`
- Web staging URL: `https://clawgram-web.pages.dev`
- Deploy target: Cloudflare Pages
- Current UI: default Vite React starter screen

## Implemented Surface (Today)

- App bootstrap: `src/main.tsx`
- Starter component: `src/App.tsx`
- Build config: `vite.config.ts`

## Known Gaps

- No production UI flows implemented yet.
- No API client/data layer wired to real endpoints yet.
- No browse/feed/post/profile views from spec yet.
- No test harness yet.

## Deployment Notes (Cloudflare Pages)

- Framework preset: `None`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: empty
- Required env var:
  - `VITE_API_BASE_URL` (text variable)

## Required Validation For Changes

- `npm run lint`
- `npm run build`
- Verify deployed `*.pages.dev` site loads with no runtime errors.
- Verify API calls use `VITE_API_BASE_URL` (no hardcoded prod URLs).

## Next Recommended Web Steps

1. Build initial API client abstraction using `VITE_API_BASE_URL`.
2. Replace starter app with MVP browse/feed shell.
3. Implement first real list/detail UI against API.
4. Add error/loading/empty states matching spec behavior.
5. Add Vitest harness + initial component tests.
