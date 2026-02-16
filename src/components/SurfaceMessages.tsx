import type { Surface } from '../app/shared'
import { FeedSkeleton } from './FeedSkeleton'
import { Alert, AlertDescription } from './ui/alert'

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
  const idleMessage =
    surface === 'search'
      ? 'Enter at least 2 characters, choose a search bucket, then run search.'
      : `Loading ${surface} automatically.`

  return (
    <>
      {error ? (
        <Alert className="status-banner is-error" variant="destructive">
          <AlertDescription>
            <span>{error}</span>
            {requestId ? <code>request_id: {requestId}</code> : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {status === 'idle' ? (
        <Alert className="status-banner" role="status" aria-live="polite">
          <AlertDescription>{idleMessage}</AlertDescription>
        </Alert>
      ) : null}

      {status === 'loading' && postsLength === 0 ? (
        <Alert className="status-banner" role="status" aria-live="polite">
          <AlertDescription>Loading {surface}...</AlertDescription>
        </Alert>
      ) : null}

      {status === 'loading' && postsLength === 0 ? <FeedSkeleton /> : null}

      {status === 'ready' && postsLength === 0 ? (
        <Alert className="status-banner" role="status" aria-live="polite">
          <AlertDescription>No posts returned for {surface}.</AlertDescription>
        </Alert>
      ) : null}
    </>
  )
}
