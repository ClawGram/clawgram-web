# ClawGram Handoff

Last updated: 2026-02-09 (US)

## 1) Objective and Current Phase

ClawGram setup has moved from planning + infrastructure bootstrap into implementation.

What is done:

- Core product spec has been heavily refined through iterative Q&A.
- API and web repos are live on hosted staging URLs.
- Supabase project is connected and partially initialized (storage buckets created).
- Agent instruction files (`AGENTS.md`) were tightened with project-specific rules and testing expectations.

What remains:

- Most MVP functionality is still to be coded.
- Existing code is mostly scaffold/stub level.

## 2) Repos and Branch Snapshot

- API repo: `clawgram-api`
  - branch: `main`
  - HEAD: `e168eee`
  - working tree status: modified `spec.md`, modified `test.md`
- Web repo: `clawgram-web`
  - branch: `main`
  - HEAD: `4c34515`
  - working tree status: modified `spec.md`
- Workspace root has:
  - `AGENTS.md` (workspace-level guide)
  - `handoff.md` (this file)
  - temporary scaffold folder `clawgram-web-tmp` (not part of product flow)

## 3) Verified Hosted Endpoints

- API base URL: `https://clawgram-api.onrender.com`
  - Verified: `GET /healthz` returns `{"success":true,"data":{"status":"ok"}}`
  - `GET /api/v1/healthz` was also previously verified by user
- Web base URL: `https://clawgram-web.pages.dev`
  - Verified reachable (HTTP 200)
  - Currently shows starter Vite React page (not product UI yet)

## 4) Deployment Configuration (Current)

### API on Render

Service: `clawgram-api`

Working build/start setup used:

- Build command: `npm ci --include=dev && npm run prisma:generate && npm run build`
- Start command: `npm start`
- Node engine pinned in `clawgram-api/package.json` to `20.x`

Important prior fix:

- Build previously failed with Prisma v7 schema validation changes.
- API was pinned back to Prisma v6 line (`prisma` + `@prisma/client` currently `^6.16.0`) to restore compatibility.

### Web on Cloudflare Pages

Working setup used:

- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: empty
- Env variable in Pages: `VITE_API_BASE_URL` set (text variable)

## 5) Supabase State (via MCP)

Connected project URL (verified): `https://xxhwyhuasrajlpjjeacq.supabase.co`

Observed DB/storage state:

- `public` schema tables: none (`[]`)
- migrations: none (`[]`)
- storage buckets:
  - `uploads` (`public=false`)
  - `public-images` (`public=true`)

## 6) Environment Variables Context

Do not store secrets in repo; keep in 1Password / provider env settings.

Observed local env variable names in root `.env.local`:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `DATABASE_URL`
- `DATABASE_PASSWORD`
- `RENDER_SERVICE_URL`
- `API_BASE_URL`

Notes:

- `DATABASE_URL` must include real DB password and must not include angle brackets.
- Frontend should only consume `VITE_*` variables.

## 7) Codebase Reality Check (Implemented vs Spec)

### API code currently implemented

Files of interest:

- `clawgram-api/src/server.ts`
- `clawgram-api/src/routes/health.ts`
- `clawgram-api/src/routes/agents.ts`
- `clawgram-api/src/routes/explore.ts`
- `clawgram-api/src/schemas/*`

Current behavior:

- Health endpoints exist and respond successfully.
- `POST /agents/register` and `GET /agents/:name` are stub/demo style.
- `GET /explore` returns empty list currently.
- Swagger is mounted at `/docs`.

Gap vs final spec:

- Many spec-required APIs and behaviors are not implemented yet.
- Envelope details in code are still simplified compared with spec (for example, no `request_id` yet in success envelope).
- Route prefix consistency is still pending (`/api/v1` alignment listed as not started in spec roadmap).

### Web code currently implemented

Files of interest:

- `clawgram-web/src/main.tsx`
- `clawgram-web/src/App.tsx`

Current behavior:

- Default Vite React template only.
- No real ClawGram screens, state model, API client layer, or auth/agent interaction flow yet.

## 8) Spec Status

- `clawgram-api/spec.md` and `clawgram-web/spec.md` are identical at file level (byte-equal).
- Both have significant local edits not yet committed in current working trees.
- Roadmap table in spec still marks major phases `not_started` (P0-P8).
- Spec includes a locked-decision log in section `12` and reports `Open Questions: None` in section `17`.

## 9) AGENTS.md Status

Project instructions were upgraded and trimmed to be ClawGram-specific:

- workspace: `AGENTS.md`
- API: `clawgram-api/AGENTS.md`
- Web: `clawgram-web/AGENTS.md`

They now include:

- source-of-truth mapping
- security constraints
- deployment baselines
- required validation steps
- explicit testing policy (Vitest preferred when test harness is added)

## 10) Testing Status

Current reality:

- No Vitest harness is installed/configured yet in either repo.
- Existing standard checks are lint/build commands only.

Recommended immediate test baseline (next agent):

1. Add Vitest to `clawgram-api` and create at least smoke tests for health + envelope format.
2. Add Vitest to `clawgram-web` and create basic render test for app shell.
3. Add `npm run test` scripts in both repos.
4. Ensure CI/deploy workflow can run lint + build (+ tests when feasible).

## 11) Priority Next Steps for New Agent

1. Stabilize contract baseline in API:
   - align route prefix strategy (`/api/v1`)
   - implement consistent success/error envelopes (including `request_id` if required by spec)
   - add centralized error handling and request ID middleware
2. Create initial Prisma schema + migrations for MVP core entities.
3. Implement auth model for agent API keys and secure key handling path.
4. Implement media upload endpoints and wire Supabase storage buckets.
5. Build first real web UI slice (browse feed + post card list) against live API.
6. Add Vitest harnesses and essential tests for API + web.
7. Commit and push in small, reviewable increments.

## 12) Useful Commands

API:

- `cd clawgram-api`
- `npm install`
- `npm run prisma:generate`
- `npm run lint`
- `npm run build`
- `npm run dev`

Web:

- `cd clawgram-web`
- `npm install`
- `npm run lint`
- `npm run build`
- `npm run dev`

Quick runtime checks:

- `curl -sS https://clawgram-api.onrender.com/healthz`
- open `https://clawgram-web.pages.dev`

## 13) Risks / Watchouts

- Prisma major upgrades (v7+) require config/schema changes; avoid unplanned upgrade during MVP build-out.
- Do not leak service-role or DB credentials to frontend.
- Current API is not production-hardened yet (auth, abuse controls, validation depth, and observability are still incomplete).
- `clawgram-web-tmp` is easy to confuse with real web repo; keep changes in `clawgram-web`.
