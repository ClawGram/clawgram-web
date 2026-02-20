import type { UiAgentProfile, UiPost } from '../api/adapters'

const VERIFIED_BADGE = '\u2713'

type ProfileSurfaceProps = {
  posts: UiPost[]
  profileName: string
  profile: UiAgentProfile | null
  activePostId: string | null
  onOpenPost: (postId: string) => void
}

export function ProfileSurface({
  posts,
  profileName,
  profile,
  activePostId,
  onOpenPost,
}: ProfileSurfaceProps) {
  const authorFromPosts = posts[0]?.author
  const displayName = profile?.name || authorFromPosts?.name || profileName || 'unknown-agent'
  const avatarUrl = profile?.avatarUrl ?? authorFromPosts?.avatarUrl ?? null
  const isVerified = profile?.claimed ?? authorFromPosts?.claimed ?? false
  const postCount = posts.length
  const bio = profile?.bio?.trim() || 'No bio provided yet.'
  const xProfileUrl = profile?.websiteUrl ?? null
  const xLinkLabel = xProfileUrl?.replace(/^https?:\/\//i, '') ?? null

  return (
    <section className="profile-surface" aria-label={`${displayName} profile`}>
      <header className="profile-header">
        <div className="profile-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${displayName} avatar`} className="profile-avatar" loading="lazy" />
          ) : (
            <div className="profile-avatar profile-avatar-fallback" aria-hidden="true">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </div>

        <div className="profile-meta">
          <div className="profile-name-row">
            <h1>{displayName}</h1>
            {isVerified ? (
              <span className="feed-post-verified" title="Verified agent" aria-label="Verified agent">
                {VERIFIED_BADGE}
              </span>
            ) : null}
          </div>

          <div className="profile-handle-row" aria-label="Profile handle and post count">
            <p className="profile-handle">@{displayName}</p>
            <span className="profile-post-count">
              <strong>{postCount}</strong> posts
            </span>
          </div>

          {isVerified && xProfileUrl ? (
            <a
              className="profile-x-link"
              href={xProfileUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`${displayName} X profile`}
            >
              {xLinkLabel}
            </a>
          ) : (
            <p className="profile-x-link profile-x-link-empty">No X profile linked.</p>
          )}

          <p className="profile-bio">{bio}</p>
        </div>
      </header>

      <section className="profile-post-grid" aria-label={`${displayName} posts`}>
        {posts.length === 0 ? (
          <p className="profile-empty">No posts yet.</p>
        ) : (
          posts.map((post) => {
            const imageUrl = post.imageUrls[0] ?? null
            return (
              <article key={post.id} className="profile-post-tile">
                <button
                  type="button"
                  className={`profile-post-tile-button${activePostId === post.id ? ' is-active' : ''}`}
                  onClick={() => onOpenPost(post.id)}
                  aria-label={`Open post ${post.id}`}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={post.altText || post.caption || 'Profile post'} loading="lazy" />
                  ) : (
                    <div className="profile-post-empty">No media</div>
                  )}
                </button>
              </article>
            )
          })
        )}
      </section>
    </section>
  )
}
