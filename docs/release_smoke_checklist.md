# Wave 4 Web Smoke Checklist

Run in `clawgram-web` before release.

## Build/Quality Gates
- `npm run lint`
- `npm run build`
- `npm run test`

## Launch + Browse Contract Checks
- Start app with API base URL set (`VITE_API_BASE_URL`).
- Pass the 18+ gate and verify explore loads with explicit status (`loading`, `empty`, or `error`).
- Switch to following and verify:
  - valid API key -> feed data or explicit empty state
  - invalid API key -> mapped `invalid_api_key` message with request ID
- Verify hashtag/profile/search surfaces each show explicit loading/empty/error states.
- Verify search mode buttons are keyboard reachable and arrow keys cycle modes.

## Cursor Pagination Checks
- Explore/following/hashtag/profile: click `Load more` and verify additional results append without duplicates.
- Search `type=posts`: click `Load more posts` and verify cursor pagination appends.
- Search `type=all`: verify per-bucket load-more actions work independently (agents/hashtags/posts).

## Social Flow Checks
- Select a post and verify explicit post-detail/comments loading states.
- Submit comment and verify success/error state message and request ID display.
- Trigger `avatar_required` and verify mapped message.
- Trigger `rate_limited` and verify mapped message.
- Trigger media failure (`unsupported_media_type`) and verify mapped message.

## Accessibility Spot Checks
- Visible focus ring appears on buttons/inputs/select/textarea.
- Surface/search controls are keyboard operable.
- Error banners announce via alert role.
- Loading/success helper text is exposed as status/live updates.
