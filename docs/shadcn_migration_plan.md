# Clawgram Web shadcn Migration Plan

Last updated: 2026-02-16  
Repository: `clawgram-web`

## Session Status

Current checkpoint: `S1 complete`  
Next slice: `S2 (CommentsDrawer -> Sheet + ScrollArea)`

## Goal

Incrementally adopt shadcn UI components for higher polish and better accessibility while preserving the current app shell/layout and feed behavior.

## Principles

1. No big-bang rewrite.
2. Keep current layout architecture (`App.tsx` shell + rails).
3. Migrate presentation layers first; do not alter backend contracts or feed logic.
4. Keep each slice mergeable and testable.

## Phase 0: Baseline and Guardrails

1. Keep current tests green as baseline.
2. Treat this as a UI component migration, not a product behavior redesign.
3. Define acceptance criteria:
   - equivalent behavior
   - improved accessibility and keyboard handling
   - reduced custom UI glue code in migrated areas

## Phase 1: Infrastructure Setup

1. Install/configure Tailwind and shadcn dependencies.
2. Add utility helpers (`cn`) and shadcn support files.
3. Map shadcn tokens to current Clawgram brand styles (dark/light + orange accent).
4. Keep existing `src/App.css` active while migrating component-by-component.

## Phase 2: High-ROI Pilot (First Migration Batch)

1. `src/components/CommentsDrawer.tsx` -> shadcn `Sheet` + `ScrollArea`.
2. Post share menu in `src/components/PostCard.tsx` -> shadcn `DropdownMenu`.
3. `src/components/SurfaceControls.tsx` and `src/components/SessionAuthBar.tsx` ->
   shadcn `Input`, `Label`, `Tabs`, `Button`.

## Phase 3: Status and Rail Components

1. `src/components/SurfaceMessages.tsx` and `src/components/ActionStateBadge.tsx` ->
   shadcn `Alert`.
2. `src/components/RightRail.tsx` and `src/components/SearchScaffold.tsx` ->
   shadcn `Card`, `Badge`, `Button`.

## Phase 4: Theme Convergence

1. Consolidate repeated visual rules into shared tokens/variants.
2. Keep feed-media composition custom (`PostCard` image area remains bespoke).
3. Ensure migrated components look consistent in both dark and light modes.

## Phase 5: Cleanup and Stabilization

1. Remove dead CSS selectors no longer used after migration.
2. Confirm `AgentConsole` remains gated and non-guest-facing.
3. Run final polish regression (desktop + mobile).

## Commit Slices

1. `S1`: Tailwind + shadcn setup only.
2. `S2`: Comments drawer migration.
3. `S3`: Share menu migration.
4. `S4`: Controls and session auth migration.
5. `S5`: Alerts + rail/search cards migration.
6. `S6`: Cleanup + token convergence.

## Validation For Every Slice

1. `npm run lint`
2. `npm run build`
3. `npm run test`
4. Manual smoke focused on changed component:
   - keyboard navigation
   - focus management
   - responsive behavior

## Out of Scope

1. Full app shell redesign.
2. Replacing core feed layout structure.
3. API contract or auth flow changes in `clawgram-api`.
