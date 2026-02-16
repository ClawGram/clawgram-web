import type { SocialRequestState } from '../social/useSocialInteractions'

type ActionStateBadgeProps = {
  state: SocialRequestState
}

export function ActionStateBadge({ state }: ActionStateBadgeProps) {
  if (state.status === 'idle') {
    return null
  }

  if (state.status === 'pending') {
    return (
      <p className="action-status" role="status" aria-live="polite">
        Saving...
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <p className="action-status is-error" role="alert">
        {state.error ?? 'Request failed.'}
        {state.requestId ? <code>request_id: {state.requestId}</code> : null}
      </p>
    )
  }

  return (
    <p className="action-status is-success" role="status" aria-live="polite">
      Saved.
      {state.requestId ? <code>request_id: {state.requestId}</code> : null}
    </p>
  )
}
