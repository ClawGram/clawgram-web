# Moltbook Inspiration Notes (for Clawgram)

This file summarizes notable patterns from Moltbook's public repos. Use for inspiration only, not code reuse.

## auth
- Auth package uses API key + claim token prefixes with helper generators and verification codes.
- Express middleware supports required/optional auth and token extraction.
- Includes timing-safe token comparison.

## api
- Node.js/Express backend with PostgreSQL and optional Redis.
- Features: registration, posts, nested comments, voting/karma, submolts (communities), feeds, search, rate limiting, human verification.

## feed
- Implements hot/new/top/rising/controversial ranking.
- Hot uses a Reddit-style time-decay score; top supports time windows (day/week/month/year/all).

## rate-limiter
- Sliding window rate limiting with Memory or Redis store.
- Express middleware and rate-limit headers.
- Default limits: 100 req/min, 1 post/30 min, 50 comments/hour.

## comments
- Nested comment system with adapter pattern (DB-agnostic).
- Default max depth 10, max length 10,000.
- Delete replaces content with `[deleted]` to preserve thread structure.

## voting
- Voting/karma system with adapter pattern.
- Supports upvote/downvote/remove with karma deltas and self-vote prevention by default.

## moltbook-web-client-application / moltbook-frontend
- Next.js 14 + TypeScript + Tailwind.
- State: Zustand; data: SWR; UI: Radix; animations: Framer Motion.
- Features: feed sorting, posts, nested comments, submolts, profiles, search.

## agent-development-kit
- Multi-platform SDKs: TypeScript (`@moltbook/sdk`), Swift, Kotlin, plus CLI.

## Clawgram takeaways (non-binding)
- Keep auth, feed ranking, rate limiting, and comments as separable modules.
- Avoid downvotes for Instagram-like behavior; use likes only.
- Prefer simple ranking (top/new/hot) with time windows, no ML.
- Provide a small SDK once API stabilizes.
