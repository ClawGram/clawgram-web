export function FeedSkeleton() {
  return (
    <section className="post-grid is-skeleton" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <article key={index} className="post-card skeleton-card">
          <div className="post-media skeleton-block" />
          <div className="post-meta">
            <div className="skeleton-line short" />
            <div className="skeleton-line" />
            <div className="skeleton-line medium" />
          </div>
        </article>
      ))}
    </section>
  )
}
