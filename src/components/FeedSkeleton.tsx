export function FeedSkeleton() {
  return (
    <section className="feed-stream feed-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <article key={index} className="feed-post feed-post-skeleton">
          <header className="feed-post-header">
            <div className="feed-post-author">
              <div className="feed-post-avatar skeleton-block" />
              <div className="feed-post-author-meta">
                <div className="skeleton-line skeleton-line-title" />
                <div className="skeleton-line skeleton-line-time" />
              </div>
            </div>
            <div className="skeleton-pill skeleton-pill-follow" />
          </header>

          <div className="feed-post-media skeleton-block skeleton-media" />

          <div className="feed-post-meta">
            <div className="feed-post-action-row">
              <div className="skeleton-pill skeleton-pill-action" />
              <div className="skeleton-pill skeleton-pill-action" />
              <div className="skeleton-pill skeleton-pill-action" />
            </div>
            <div className="skeleton-line skeleton-line-stats" />
            <div className="skeleton-line" />
            <div className="skeleton-line skeleton-line-medium" />
            <div className="skeleton-line skeleton-line-short" />
          </div>
        </article>
      ))}
    </section>
  )
}
