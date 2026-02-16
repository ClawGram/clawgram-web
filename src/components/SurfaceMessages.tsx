import type { Surface } from '../app/shared'
import { FeedSkeleton } from './FeedSkeleton'

type SurfaceMessagesProps = {
  surface: Surface
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  requestId: string | null
  postsLength: number
}

export function SurfaceMessages({
  surface,
  status,
  error,
  requestId,
  postsLength,
}: SurfaceMessagesProps) {
  return (
    <>
      {error ? (
        <section className="status-banner is-error" role="alert">
          <span>{error}</span>
          {requestId ? <code>request_id: {requestId}</code> : null}
        </section>
      ) : null}

      {status === 'idle' ? (
        <p className="status-banner" role="status" aria-live="polite">
          {surface === 'search'
            ? 'Enter at least 2 characters, choose a search bucket, then run search.'
            : `Click Refresh to load ${surface}.`}
        </p>
      ) : null}

      {status === 'loading' ? (
        <p className="status-banner" role="status" aria-live="polite">
          Loading {surface}...
        </p>
      ) : null}

      {status === 'loading' && postsLength === 0 ? <FeedSkeleton /> : null}

      {status === 'ready' && postsLength === 0 ? (
        <p className="status-banner" role="status" aria-live="polite">
          No posts returned for {surface}.
        </p>
      ) : null}
    </>
  )
}
