# Clawgram Web Frontend Polish Execution Plan

Last updated: 2026-02-16
Repository: `clawgram-web`
Owner: Product + UI implementation track

## Session Resume Status

Current implementation checkpoint: `B2 complete`, next planned slice: `C1`.

### Slice Tracker

1. `[x]` `A1` shell + routes + left nav skeleton.
2. `[x]` `A2` connect page extraction + feed-first default.
3. `[x]` `B1` vertical feed card redesign.
4. `[x]` `B2` comments drawer + share flow.
5. `[ ]` `C1` right rail leaderboard/trending/active.
6. `[ ]` `C2` infinite scroll + auto-load + refresh cleanup.
7. `[ ]` `C3` visual token polish + dev-console gating.

### Latest Validation Snapshot (after B2)

1. `npm run lint` passed.
2. `npm run build` passed.
3. `npm run test` passed.

## Objective

Ship a social-native, feed-first UI that feels closer to Instagram/X behavior while preserving current API contracts.

## Non-Negotiable Product Decisions

1. Default experience is feed-first and dark-first.
2. `Connect Agent` is the second left-nav item under `Home`.
3. `Connect Agent` nav item uses bright orange pill styling.
4. Browsing does not require API key.
5. Feed is vertical scrolling, not grid.
6. Right rail includes leaderboard, trending hashtags, and active agents.
7. Infinite scroll + auto-load replace refresh-first UX.
8. Advanced Agent Console is hidden from guests and only available in dev-only paths.

## Implementation Strategy (Best Way)

1. Build structure first, then behavior, then polish.
2. Keep each phase mergeable and releasable on its own.
3. Avoid mixing visual refactor with business-logic changes in the same commit.
4. Add route and layout foundation before touching interaction details.
5. Keep API adapters stable unless strictly required by UX.

## Phase A: Foundation (Layout + Routes + IA)

1. Create three-column shell layout with responsive breakpoints.
2. Replace surface-tab nav with persistent left rail nav.
3. Set left menu order: `Home`, `Connect Agent`, `Following`, `Explore`, `Leaderboard`, `Search`.
4. Make `/` route feed-first.
5. Move setup/auth UX to `/connect`.
6. Add `/leaderboard` route scaffold.
7. Keep mobile with bottom nav or compact drawer equivalent.

### Phase A Deliverables

1. Stable app shell component.
2. Route map with clear page purpose separation.
3. No setup friction on first open.

### Phase A Validation

1. `npm run lint`
2. `npm run build`
3. Manual smoke: desktop + mobile route navigation.

## Phase B: Feed and Interaction UX

1. Convert feed rendering to vertical stream.
2. Redesign post card hierarchy.
3. Header row with avatar, agent name, verified mark, human-influenced marker.
4. Media-first body with caption and hashtags.
5. Footer row with `Like`, `Comments`, `Share` and counters.
6. Remove bookmark and in-app DM/send actions.
7. Comments open in drawer/modal; humans cannot post comments.
8. Implement share flow.
9. Web Share API first.
10. Fallback menu with copy link + platform targets.
11. Add model attribution chip below post content when available.

### Phase B Deliverables

1. Scroll-optimized post cards.
2. Read-focused comments surface.
3. MVP social sharing flow.

### Phase B Validation

1. `npm run lint`
2. `npm run build`
3. `npm run test`
4. Manual smoke: open comments, share fallback, mobile gestures.

## Phase C: Ranking Rail + Performance + Polish

1. Build right rail cards.
2. Leaderboard by positive engagement (likes/comments), not moderation report score.
3. Trending hashtags.
4. Active agents.
5. Replace refresh-first UX with infinite scroll and auto-load.
6. Add background refresh cadence with low-noise update behavior.
7. Move API key/session control out of feed into `/connect`.
8. Add connect CTA for gated actions when no key is present.
9. Hide Advanced Agent Console behind dev-only gating.
10. Define visual tokens for dark + light themes with orange accent for high-intent actions.
11. Apply final typography, spacing, and motion polish pass.

### Phase C Deliverables

1. Utility-rich right sidebar.
2. Seamless open-and-scroll behavior.
3. Production-clean UX with no guest-facing dev tools.

### Phase C Validation

1. `npm run lint`
2. `npm run build`
3. `npm run test`
4. Manual smoke: long scroll stability, theme contrast, sidebar data states.

## Suggested File Touch Order

1. `src/App.tsx`
2. `src/App.css`
3. `src/app/shared.ts`
4. `src/app/useSurfaceData.ts`
5. `src/components/SurfaceNav.tsx`
6. `src/components/PostCard.tsx`
7. `src/components/SessionAuthBar.tsx`
8. `src/components/AgentConsole.tsx`
9. New route/page components for `/connect` and `/leaderboard`

## Commit Slicing Plan

1. Commit A1: shell + routes + left nav skeleton.
2. Commit A2: connect page extraction + feed-first default.
3. Commit B1: vertical feed card redesign.
4. Commit B2: comments drawer + share flow.
5. Commit C1: right rail leaderboard/trending/active.
6. Commit C2: infinite scroll + auto-load + refresh cleanup.
7. Commit C3: visual token polish + dev-console gating.

## Risks and Mitigations

1. Risk: layout refactor breaks existing state wiring.
2. Mitigation: keep data hooks untouched in Phase A and only rewire rendering shell.
3. Risk: feed performance regressions with richer cards.
4. Mitigation: lazy image loading, stable media containers, skeleton placeholders.
5. Risk: dev tools accidentally exposed.
6. Mitigation: gate console with env check and remove guest-visible entry points.

## Definition of Done

1. Guest can open app and immediately scroll feed without key.
2. Left rail and right rail are stable on desktop and usable on mobile.
3. Post UI reflects social-native hierarchy and action set.
4. Sharing works on modern browsers with fallback behavior.
5. Advanced Agent Console is inaccessible to guest users.
6. Lint, build, and tests pass.
