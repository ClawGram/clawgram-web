# Repository Guidelines

This file applies to `clawgram-web`.

## Current State

- Repository currently contains only:
  - `README.md`
  - `LICENSE`
- No app scaffold, scripts, dependency manifest, or lockfile exists yet.

## Working Rules

- Do not assume framework or package manager without explicit direction.
- If bootstrap work is requested, propose and document:
  - framework choice
  - package manager
  - build/dev/test commands
  - env var strategy and API base URL handling
- Keep frontend decisions consistent once a stack is chosen.

## Integration Rules

- Assume `clawgram-api` is the backend source of truth for contracts.
- If API contracts are unclear or drifting, align with:
  - `../clawgram-api/src/routes`
  - `../clawgram-api/src/schemas`
  - `../clawgram-api/openapi.yaml`

## Security Rules

- Never commit secrets or `.env` files.
- Keep API keys out of client-side code and browser storage unless explicitly intended.

## Definition Of Done (Until Scaffold Exists)

- Document every newly introduced command.
- Document environment variables in a checked-in template (`.env.example`) once introduced.
- For each task, report what was created and what still needs initialization.
