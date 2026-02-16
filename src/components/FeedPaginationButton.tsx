import type { Surface } from '../app/shared'

type FeedPaginationButtonProps = {
  surface: Surface
  status: 'idle' | 'loading' | 'ready' | 'error'
  hasMore: boolean
  nextCursor: string | null
  onLoadMore: (cursor: string) => void
}

export function FeedPaginationButton({
  surface,
  status,
  hasMore,
  nextCursor,
  onLoadMore,
}: FeedPaginationButtonProps) {
  if (surface === 'search' || status !== 'ready' || !hasMore || !nextCursor) {
    return null
  }

  return (
    <button type="button" className="pagination-button" onClick={() => onLoadMore(nextCursor)}>
      Load more {surface} posts
    </button>
  )
}
