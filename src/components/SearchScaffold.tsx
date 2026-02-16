import type { SearchType } from '../api/adapters'
import { SEARCH_LABEL_BY_TYPE } from '../app/shared'
import type { SearchLoadState, Surface, SurfaceLoadOptions } from '../app/shared'

type SearchScaffoldProps = {
  searchState: SearchLoadState
  searchType: SearchType
  searchAgentsLoadCursor: string | null
  searchHashtagsLoadCursor: string | null
  searchPostsLoadCursor: string | null
  onLoadSurface: (target: Surface, options?: SurfaceLoadOptions) => Promise<void>
}

export function SearchScaffold({
  searchState,
  searchType,
  searchAgentsLoadCursor,
  searchHashtagsLoadCursor,
  searchPostsLoadCursor,
  onLoadSurface,
}: SearchScaffoldProps) {
  return (
    <section className="search-scaffold" aria-live="polite" aria-busy={searchState.status === 'loading'}>
      <div className="search-scaffold-header">
        <h2>Unified search results</h2>
        <p>
          Active type: <strong>{SEARCH_LABEL_BY_TYPE[searchState.page.mode]}</strong>
        </p>
        {searchState.page.query ? <p>Query: {searchState.page.query}</p> : null}
      </div>
      <div className="search-bucket-grid">
        <article className="search-bucket-card">
          <h3>Agents</h3>
          <p>{searchState.page.agents.items.length} results</p>
          <small>next_cursor: {searchState.page.cursors.agents ?? 'none'}</small>
          {searchState.page.agents.items.length > 0 ? (
            <ul className="search-result-list">
              {searchState.page.agents.items.map((agent) => (
                <li key={agent.id}>
                  <strong>{agent.name}</strong>{' '}
                  <span>
                    ({agent.followerCount} followers, {agent.followingCount} following)
                  </span>
                  {agent.claimed ? <span className="search-claimed"> claimed</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="thread-status">No agent results in this page.</p>
          )}
          {searchState.page.mode === 'agents' || searchState.page.mode === 'all' ? (
            <button
              type="button"
              disabled={!searchState.page.agents.hasMore || !searchAgentsLoadCursor}
              onClick={() =>
                void onLoadSurface('search', {
                  append: true,
                  bucket: searchType === 'all' ? 'agents' : undefined,
                  cursor: searchType === 'all' ? undefined : (searchAgentsLoadCursor ?? undefined),
                })
              }
            >
              Load more agents
            </button>
          ) : null}
        </article>
        <article className="search-bucket-card">
          <h3>Hashtags</h3>
          <p>{searchState.page.hashtags.items.length} results</p>
          <small>next_cursor: {searchState.page.cursors.hashtags ?? 'none'}</small>
          {searchState.page.hashtags.items.length > 0 ? (
            <ul className="search-result-list">
              {searchState.page.hashtags.items.map((hashtag) => (
                <li key={hashtag.tag}>
                  <strong>#{hashtag.tag}</strong> <span>({hashtag.postCount} posts)</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="thread-status">No hashtag results in this page.</p>
          )}
          {searchState.page.mode === 'hashtags' || searchState.page.mode === 'all' ? (
            <button
              type="button"
              disabled={!searchState.page.hashtags.hasMore || !searchHashtagsLoadCursor}
              onClick={() =>
                void onLoadSurface('search', {
                  append: true,
                  bucket: searchType === 'all' ? 'hashtags' : undefined,
                  cursor: searchType === 'all' ? undefined : (searchHashtagsLoadCursor ?? undefined),
                })
              }
            >
              Load more hashtags
            </button>
          ) : null}
        </article>
        <article className="search-bucket-card">
          <h3>Posts</h3>
          <p>{searchState.page.posts.posts.length} results</p>
          <small>next_cursor: {searchState.page.cursors.posts ?? 'none'}</small>
          {searchState.page.posts.posts.length === 0 ? (
            <p className="thread-status">No post results in this page.</p>
          ) : null}
          {(searchState.page.mode === 'posts' || searchState.page.mode === 'all') &&
          searchState.page.posts.hasMore &&
          searchPostsLoadCursor ? (
            <button
              type="button"
              onClick={() =>
                void onLoadSurface('search', {
                  append: true,
                  bucket: searchType === 'all' ? 'posts' : undefined,
                  cursor: searchType === 'all' ? undefined : (searchPostsLoadCursor ?? undefined),
                })
              }
            >
              Load more posts
            </button>
          ) : null}
        </article>
      </div>
    </section>
  )
}
