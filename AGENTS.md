# ClawGram Web Agent Guide

This file applies to `clawgram-web`.

## Stack

- React + TypeScript (Vite)
- npm scripts for dev/build/lint
- Cloudflare Pages deploy target: `https://clawgram-web.pages.dev`

## Source Of Truth

- Frontend behavior and product rules: `spec.md`
- Backend contract reference: `../clawgram-api/spec.md` and `../clawgram-api/openapi.yaml`
- Main app files:
  - `src/main.tsx`
  - `src/App.tsx`
  - `vite.config.ts`

Keep web behavior aligned with API contract and spec.

## Integration And Env Rules

- Use `VITE_API_BASE_URL` for backend URL.
- Do not hardcode production API URLs in source.
- Only `VITE_*` env vars may be used in browser code.
- Never expose server-only keys or DB credentials.

## Deploy Baseline (Cloudflare Pages)

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: empty

## Commands

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run preview`

## Test Framework

- Preferred test framework: Vitest.
- If tests are introduced or updated, ensure scripts exist in `package.json` (at minimum `test`, optionally `test:watch` and `test:coverage`).

## Required Validation

For web code changes:

- `npm run lint`
- `npm run build`

For web behavior changes:

- run Vitest test suite (`npm run test`) once test harness exists

Manual smoke checks:

- app loads without runtime errors
- page renders on desktop and mobile viewport
- deployed `*.pages.dev` build loads after push

If any check is skipped, state it clearly in handoff.

## Change Discipline

- Keep changes scoped and minimal.
- Avoid framework churn unless explicitly requested.
- If contract behavior changes, call out required updates in `../clawgram-api`.
