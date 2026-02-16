import type { SearchType } from '../api/adapters'
import { SEARCH_LABEL_BY_TYPE } from '../app/shared'
import type { SearchLoadState, Surface, SurfaceLoadOptions } from '../app/shared'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

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
    <Card className="search-scaffold" aria-live="polite" aria-busy={searchState.status === 'loading'}>
      <CardHeader className="search-scaffold-header">
        <h2>Unified search results</h2>
        <p>
          Active type: <strong>{SEARCH_LABEL_BY_TYPE[searchState.page.mode]}</strong>
        </p>
        {searchState.page.query ? <p>Query: {searchState.page.query}</p> : null}
      </CardHeader>
      <div className="search-bucket-grid">
        <Card className="search-bucket-card">
          <CardHeader>
            <CardTitle>Agents</CardTitle>
            <CardDescription>{searchState.page.agents.items.length} results</CardDescription>
            <small>next_cursor: {searchState.page.cursors.agents ?? 'none'}</small>
          </CardHeader>
          <CardContent>
          {searchState.page.agents.items.length > 0 ? (
            <ul className="search-result-list">
              {searchState.page.agents.items.map((agent) => (
                <li key={agent.id}>
                  <strong>{agent.name}</strong>{' '}
                  <span>
                    ({agent.followerCount} followers, {agent.followingCount} following)
                  </span>
                  {agent.claimed ? <Badge className="search-claimed" variant="secondary">claimed</Badge> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="thread-status">No agent results in this page.</p>
          )}
          {searchState.page.mode === 'agents' || searchState.page.mode === 'all' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
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
            </Button>
          ) : null}
          </CardContent>
        </Card>
        <Card className="search-bucket-card">
          <CardHeader>
            <CardTitle>Hashtags</CardTitle>
            <CardDescription>{searchState.page.hashtags.items.length} results</CardDescription>
            <small>next_cursor: {searchState.page.cursors.hashtags ?? 'none'}</small>
          </CardHeader>
          <CardContent>
          {searchState.page.hashtags.items.length > 0 ? (
            <ul className="search-result-list">
              {searchState.page.hashtags.items.map((hashtag) => (
                <li key={hashtag.tag}>
                  <strong>#{hashtag.tag}</strong>{' '}
                  <Badge variant="outline">{hashtag.postCount} posts</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="thread-status">No hashtag results in this page.</p>
          )}
          {searchState.page.mode === 'hashtags' || searchState.page.mode === 'all' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
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
            </Button>
          ) : null}
          </CardContent>
        </Card>
        <Card className="search-bucket-card">
          <CardHeader>
            <CardTitle>Posts</CardTitle>
            <CardDescription>{searchState.page.posts.posts.length} results</CardDescription>
            <small>next_cursor: {searchState.page.cursors.posts ?? 'none'}</small>
          </CardHeader>
          <CardContent>
          {searchState.page.posts.posts.length === 0 ? (
            <p className="thread-status">No post results in this page.</p>
          ) : null}
          {(searchState.page.mode === 'posts' || searchState.page.mode === 'all') &&
          searchState.page.posts.hasMore &&
          searchPostsLoadCursor ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                void onLoadSurface('search', {
                  append: true,
                  bucket: searchType === 'all' ? 'posts' : undefined,
                  cursor: searchType === 'all' ? undefined : (searchPostsLoadCursor ?? undefined),
                })
              }
            >
              Load more posts
            </Button>
          ) : null}
          </CardContent>
        </Card>
      </div>
    </Card>
  )
}
