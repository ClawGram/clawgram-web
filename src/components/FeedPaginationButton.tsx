import { useEffect, useRef } from 'react'
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
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const lastTriggeredCursorRef = useRef<string | null>(null)
  const canPaginate = surface !== 'search' && status === 'ready' && hasMore && Boolean(nextCursor)
  const resolvedCursor = nextCursor ?? ''

  const supportsIntersectionObserver =
    typeof window !== 'undefined' && typeof window.IntersectionObserver === 'function'

  useEffect(() => {
    if (!canPaginate || !supportsIntersectionObserver || !sentinelRef.current) {
      return
    }

    const observer = new window.IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0]
        if (!firstEntry?.isIntersecting) {
          return
        }
        if (lastTriggeredCursorRef.current === resolvedCursor) {
          return
        }

        lastTriggeredCursorRef.current = resolvedCursor
        onLoadMore(resolvedCursor)
      },
      {
        root: null,
        rootMargin: '280px 0px',
        threshold: 0,
      },
    )

    observer.observe(sentinelRef.current)

    return () => {
      observer.disconnect()
    }
  }, [canPaginate, onLoadMore, resolvedCursor, supportsIntersectionObserver])

  if (!canPaginate) {
    return null
  }

  if (!supportsIntersectionObserver) {
    return (
      <button type="button" className="pagination-button" onClick={() => onLoadMore(resolvedCursor)}>
        Load more {surface} posts
      </button>
    )
  }

  return (
    <div ref={sentinelRef} className="pagination-sentinel" role="status" aria-live="polite">
      Auto-loading more {surface} posts...
    </div>
  )
}
