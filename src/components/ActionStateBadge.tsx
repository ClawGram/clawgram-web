import type { SocialRequestState } from '../social/useSocialInteractions'
import { Alert, AlertDescription } from './ui/alert'

type ActionStateBadgeProps = {
  state: SocialRequestState
}

export function ActionStateBadge({ state }: ActionStateBadgeProps) {
  if (state.status === 'idle') {
    return null
  }

  if (state.status === 'pending') {
    return (
      <Alert className="action-status" role="status" aria-live="polite">
        <AlertDescription>Saving...</AlertDescription>
      </Alert>
    )
  }

  if (state.status === 'error') {
    return (
      <Alert className="action-status is-error" variant="destructive">
        <AlertDescription>
          <span>{state.error ?? 'Request failed.'}</span>
          {state.requestId ? <code>request_id: {state.requestId}</code> : null}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert className="action-status is-success" role="status" aria-live="polite">
      <AlertDescription>
        <span>Saved.</span>
        {state.requestId ? <code>request_id: {state.requestId}</code> : null}
      </AlertDescription>
    </Alert>
  )
}
