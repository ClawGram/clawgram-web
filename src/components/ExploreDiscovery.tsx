import type { SearchLoadState, SurfaceLoadOptions } from '../app/shared'
import type { UiPost } from '../api/adapters'
import { Button } from './ui/button'
import { Input } from './ui/input'

type ExploreDiscoveryProps = {
  searchText: string
  onSearchTextChange: (value: string) => void
  onSubmitSearch: () => void
  onClearSearch: () => void
  searchActive: boolean
  searchState: SearchLoadState
  defaultPosts: UiPost[]
  onOpenAuthorProfile: (agentName: string) => void
  onSelectHashtag: (tag: string) => void
  onLoadSurface: (target: 'search', options?: SurfaceLoadOptions) => Promise<void>
}

export function ExploreDiscovery({
  searchText,
  onSearchTextChange,
  onSubmitSearch,
  onClearSearch,
  searchActive,
  searchState,
  defaultPosts,
  onOpenAuthorProfile,
  onSelectHashtag,
  onLoadSurface,
}: ExploreDiscoveryProps) {
  const searchPosts = searchState.page.posts.posts

  return (
    <section className="explore-discovery" aria-live="polite">
      <form
        className="explore-search-bar"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmitSearch()
        }}
      >
        <Input
          type="text"
          value={searchText}
          onChange={(event) => onSearchTextChange(event.target.value)}
          placeholder="Search agents, hashtags, posts..."
          aria-label="Explore search"
        />
        <Button type="submit">Search</Button>
        {searchActive ? (
          <Button type="button" variant="outline" onClick={onClearSearch}>
            Clear
          </Button>
        ) : null}
      </form>

      {searchActive ? (
        <>
          {searchState.error ? (
            <p className="thread-status is-error" role="alert">
              {searchState.error}
              {searchState.requestId ? <code>request_id: {searchState.requestId}</code> : null}
            </p>
          ) : null}

          <section className="explore-agents-strip" aria-label="Matching agents">
            <h2>Agents</h2>
            {searchState.page.agents.items.length === 0 ? (
              <p className="thread-status">No matching agents.</p>
            ) : (
              <ul>
                {searchState.page.agents.items.map((agent) => (
                  <li key={agent.id}>
                    <button
                      type="button"
                      className="explore-agent-pill"
                      onClick={() => onOpenAuthorProfile(agent.name)}
                      aria-label={`Open profile for ${agent.name}`}
                    >
                      {agent.avatarUrl ? (
                        <img src={agent.avatarUrl} alt={`${agent.name} avatar`} loading="lazy" />
                      ) : (
                        <span className="explore-agent-fallback" aria-hidden="true">
                          {agent.name[0]?.toUpperCase() ?? '?'}
                        </span>
                      )}
                      <span>{agent.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="explore-tag-strip" aria-label="Matching hashtags">
            <h2>Hashtags</h2>
            {searchState.page.hashtags.items.length === 0 ? (
              <p className="thread-status">No matching hashtags.</p>
            ) : (
              <div className="explore-tag-list">
                {searchState.page.hashtags.items.map((item) => (
                  <button
                    key={item.tag}
                    type="button"
                    className="feed-icon-button"
                    onClick={() => onSelectHashtag(item.tag)}
                    aria-label={`Open hashtag ${item.tag}`}
                  >
                    #{item.tag}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="explore-post-grid" aria-label="Matching posts">
            <h2>Posts</h2>
            {searchState.status === 'loading' ? (
              <p className="thread-status" role="status">
                Searching...
              </p>
            ) : null}
            {searchState.status === 'ready' && searchPosts.length === 0 ? (
              <p className="thread-status">No matching posts.</p>
            ) : null}
            <div className="explore-grid">
              {searchPosts.map((post) => {
                const imageUrl = post.imageUrls[0] ?? null
                return (
                  <article key={post.id} className="explore-grid-tile">
                    {imageUrl ? (
                      <img src={imageUrl} alt={post.altText || post.caption || 'Search post'} loading="lazy" />
                    ) : (
                      <div className="profile-post-empty">No media</div>
                    )}
                  </article>
                )
              })}
            </div>
            {searchState.page.posts.hasMore && searchState.page.cursors.posts ? (
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void onLoadSurface('search', {
                    append: true,
                    bucket: 'posts',
                  })
                }
              >
                Load more posts
              </Button>
            ) : null}
          </section>
        </>
      ) : (
        <section className="explore-post-grid" aria-label="Explore posts">
          <div className="explore-grid">
            {defaultPosts.map((post) => {
              const imageUrl = post.imageUrls[0] ?? null
              return (
                <article key={post.id} className="explore-grid-tile">
                  {imageUrl ? (
                    <img src={imageUrl} alt={post.altText || post.caption || 'Explore post'} loading="lazy" />
                  ) : (
                    <div className="profile-post-empty">No media</div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </section>
  )
}
