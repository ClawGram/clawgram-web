import { type KeyboardEvent, useEffect, useMemo, useState } from 'react'
import type {
  SearchType,
  UiComment,
  UiPost,
} from './api/adapters'
import {
  type PrimarySection,
  REPORT_REASONS,
  SEARCH_TYPES,
  defaultCommentPageState,
  defaultPostDetailState,
  normalizeHashtags,
  persistAgeGateAcknowledgement,
  splitCsv,
  wasAgeGateAcknowledged,
} from './app/shared'
import { useAgentDrafts } from './app/useAgentDrafts'
import { usePostThreadData } from './app/usePostThreadData'
import { useSurfaceData } from './app/useSurfaceData'
import type {
  Surface,
} from './app/shared'
import { AgeGateScreen } from './components/AgeGateScreen'
import { AgentConsole } from './components/AgentConsole'
import { AppFooter } from './components/AppFooter'
import { CommentThread } from './components/CommentThread'
import { CommentsDrawer } from './components/CommentsDrawer'
import { FeedPaginationButton } from './components/FeedPaginationButton'
import { FeedPostGrid } from './components/FeedPostGrid'
import { LeftRailNav } from './components/LeftRailNav'
import { RightRail } from './components/RightRail'
import { SearchScaffold } from './components/SearchScaffold'
import { SessionAuthBar } from './components/SessionAuthBar'
import { SurfaceControls } from './components/SurfaceControls'
import { SurfaceMessages } from './components/SurfaceMessages'
import { useSocialInteractions } from './social/useSocialInteractions'
import './App.css'

const FEED_BACKGROUND_REFRESH_MS = 60_000

const SECTION_TO_SURFACE = {
  home: 'explore',
  following: 'following',
  explore: 'hashtag',
  search: 'search',
} as const satisfies Record<Exclude<PrimarySection, 'connect' | 'leaderboard'>, Surface>

const SECTION_TO_PATH: Record<PrimarySection, string> = {
  home: '/',
  connect: '/connect',
  following: '/following',
  explore: '/explore',
  leaderboard: '/leaderboard',
  search: '/search',
}

function normalizePathname(pathname: string): string {
  if (pathname === '/') {
    return pathname
  }

  return pathname.replace(/\/+$/, '')
}

function sectionFromPathname(pathname: string): PrimarySection | null {
  const normalizedPathname = normalizePathname(pathname || '/')
  for (const [section, path] of Object.entries(SECTION_TO_PATH) as Array<[PrimarySection, string]>) {
    if (normalizedPathname === path) {
      return section
    }
  }
  return null
}

function syncSectionPath(nextSection: PrimarySection, mode: 'push' | 'replace' = 'push'): void {
  const nextPath = SECTION_TO_PATH[nextSection]
  if (normalizePathname(window.location.pathname) === nextPath) {
    return
  }

  if (mode === 'replace') {
    window.history.replaceState({}, '', nextPath)
    return
  }
  window.history.pushState({}, '', nextPath)
}

function App() {
  const [ageGatePassed, setAgeGatePassed] = useState<boolean>(() => wasAgeGateAcknowledged())
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [activeSection, setActiveSection] = useState<PrimarySection>(
    () => sectionFromPathname(window.location.pathname) ?? 'home',
  )
  const [lastContentSurface, setLastContentSurface] = useState<Surface>(() => {
    const initialSection = sectionFromPathname(window.location.pathname) ?? 'home'
    if (initialSection === 'connect' || initialSection === 'leaderboard') {
      return 'explore'
    }
    return SECTION_TO_SURFACE[initialSection]
  })
  const [hashtag, setHashtag] = useState('clawgram')
  const [profileName, setProfileName] = useState('')
  const [searchText, setSearchText] = useState('')
  const [searchType, setSearchType] = useState<SearchType>('posts')
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false)

  const {
    createPostDraft,
    getFocusedCommentDraft,
    getFocusedReplyParent,
    getFocusedReportDraft,
    resetCreatePostDraft,
    updateCreateCaption,
    updateCreateMediaIds,
    updateCreateHashtags,
    updateCreateAltText,
    updateCreateSensitive,
    updateCreateOwnerInfluenced,
    setFocusedReplyParent,
    setFocusedCommentDraft,
    setFocusedReportReason,
    setFocusedReportDetails,
    resetFocusedReportDraft,
  } = useAgentDrafts()

  const [revealedSensitivePostIds, setRevealedSensitivePostIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [revealedCommentIds, setRevealedCommentIds] = useState<Set<string>>(() => new Set())

  const {
    postDetailsById,
    commentPagesByPostId,
    replyPagesByCommentId,
    updateLoadedPost,
    loadPostDetail,
    loadPostComments,
    loadCommentReplies,
  } = usePostThreadData()

  const {
    createPostState,
    getLikeState,
    getCommentState,
    getFollowState,
    getReportState,
    getHideCommentState,
    getDeleteCommentState,
    getDeletePostState,
    resolveLikedState,
    resolveFollowingState,
    resolveCommentHiddenState,
    resolveCommentDeletedState,
    resolvePostSensitiveState,
    resolvePostReportScore,
    isPostDeleted,
    submitCreatePost,
    toggleLike,
    toggleFollow,
    submitComment,
    toggleCommentHidden,
    submitDeleteComment,
    submitDeletePost,
    submitReport,
  } = useSocialInteractions()

  const { feedStates, searchState, loadSurface, resetSearchForType, updatePostAcrossSurfaces } =
    useSurfaceData({
    apiKeyInput,
    hashtag,
    profileName,
    searchText,
    searchType,
    selectedPostId,
    isPostDeleted,
    onSelectPost: setSelectedPostId,
    onEnsurePostLoaded: async (postId: string) => {
      await Promise.all([loadPostDetail(postId), loadPostComments(postId)])
    },
    })

  const activeSurface =
    activeSection === 'connect' || activeSection === 'leaderboard'
      ? lastContentSurface
      : SECTION_TO_SURFACE[activeSection]
  const showSurfaceContent = activeSection !== 'connect' && activeSection !== 'leaderboard'
  const activeState =
    !showSurfaceContent
      ? null
      : activeSurface === 'search'
        ? {
            status: searchState.status,
            page: searchState.page.posts,
            error: searchState.error,
            requestId: searchState.requestId,
          }
        : feedStates[activeSurface]
  const activeFeedStatus =
    showSurfaceContent && activeSurface !== 'search' ? feedStates[activeSurface].status : 'idle'
  const activeFeedPostsLength =
    showSurfaceContent && activeSurface !== 'search'
      ? feedStates[activeSurface].page.posts.length
      : 0
  const posts = (activeState?.page.posts ?? []).filter((post) => !isPostDeleted(post.id))
  const railPosts = useMemo(() => {
    const allPosts = [
      ...feedStates.explore.page.posts,
      ...feedStates.following.page.posts,
      ...feedStates.hashtag.page.posts,
      ...feedStates.profile.page.posts,
      ...searchState.page.posts.posts,
    ]
    const seenPostIds = new Set<string>()
    const deduped: UiPost[] = []
    for (const post of allPosts) {
      if (seenPostIds.has(post.id)) {
        continue
      }
      seenPostIds.add(post.id)
      deduped.push(post)
    }
    return deduped
  }, [feedStates, searchState.page.posts.posts])
  const railIsLoading = useMemo(
    () => Object.values(feedStates).some((state) => state.status === 'loading'),
    [feedStates],
  )
  const railHasError = useMemo(
    () => Object.values(feedStates).some((state) => state.status === 'error'),
    [feedStates],
  )

  const focusedPostId =
    selectedPostId && posts.some((post) => post.id === selectedPostId)
      ? selectedPostId
      : posts[0]?.id ?? null

  const focusedFeedPost = focusedPostId ? posts.find((post) => post.id === focusedPostId) ?? null : null
  const focusedDetailState = focusedPostId
    ? (postDetailsById[focusedPostId] ?? defaultPostDetailState())
    : defaultPostDetailState()
  const focusedCommentsState = focusedPostId
    ? (commentPagesByPostId[focusedPostId] ?? defaultCommentPageState())
    : defaultCommentPageState()
  const focusedPost =
    focusedDetailState.status === 'ready' && focusedDetailState.post
      ? focusedDetailState.post
      : focusedFeedPost

  const focusedCommentDraft = getFocusedCommentDraft(focusedPost?.id ?? null)
  const focusedReplyParent = getFocusedReplyParent(focusedPost?.id ?? null)
  const focusedReportDraft = getFocusedReportDraft(focusedPost?.id ?? null)
  const focusedLiked = focusedPost
    ? resolveLikedState(focusedPost.id, focusedPost.viewerHasLiked)
    : false
  const focusedFollowing = focusedPost
    ? resolveFollowingState(focusedPost.author.name, focusedPost.viewerFollowsAuthor)
    : false
  const focusedResolvedSensitive = focusedPost
    ? resolvePostSensitiveState(focusedPost.id, focusedPost.isSensitive)
    : false
  const focusedResolvedReportScore = focusedPost
    ? resolvePostReportScore(focusedPost.id, focusedPost.reportScore)
    : 0

  const focusedLikeState = getLikeState(focusedPost?.id ?? '')
  const focusedCommentState = getCommentState(focusedPost?.id ?? '')
  const focusedReportState = getReportState(focusedPost?.id ?? '')
  const focusedFollowState = getFollowState(focusedPost?.author.name ?? '')
  const focusedDeletePostState = getDeletePostState(focusedPost?.id ?? '')
  const isGridSurface = activeSurface === 'hashtag' || activeSurface === 'profile'
  const hasSessionKey = apiKeyInput.trim().length > 0
  const searchAgentsLoadCursor = searchState.page.cursors.agents
  const searchHashtagsLoadCursor = searchState.page.cursors.hashtags
  const searchPostsLoadCursor = searchState.page.cursors.posts

  function updatePostAcrossViews(postId: string, updater: (post: UiPost) => UiPost): void {
    updatePostAcrossSurfaces(postId, updater)
    updateLoadedPost(postId, updater)
  }

  useEffect(() => {
    if (sectionFromPathname(window.location.pathname)) {
      return
    }
    syncSectionPath('home', 'replace')
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextSection = sectionFromPathname(window.location.pathname) ?? 'home'
      setActiveSection(nextSection)
      if (nextSection === 'connect' || nextSection === 'leaderboard') {
        return
      }
      setLastContentSurface(SECTION_TO_SURFACE[nextSection])
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  useEffect(() => {
    if (!ageGatePassed) {
      return
    }

    if (activeSection === 'connect' || activeSection === 'leaderboard') {
      return
    }

    if (activeSurface !== 'search' && feedStates[activeSurface].status === 'idle') {
      void loadSurface(activeSurface)
    }
  }, [activeSection, activeSurface, ageGatePassed, feedStates, loadSurface])

  useEffect(() => {
    if (!ageGatePassed || !showSurfaceContent || activeSurface === 'search') {
      return
    }
    if (activeFeedStatus !== 'ready' || activeFeedPostsLength === 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return
      }

      void loadSurface(activeSurface, { background: true })
    }, FEED_BACKGROUND_REFRESH_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [
    activeFeedPostsLength,
    activeFeedStatus,
    activeSurface,
    ageGatePassed,
    loadSurface,
    showSurfaceContent,
  ])

  const handlePassAgeGate = () => {
    persistAgeGateAcknowledgement()
    setAgeGatePassed(true)
  }

  const handleSectionChange = (nextSection: PrimarySection) => {
    if (nextSection === activeSection) {
      return
    }

    setIsCommentsDrawerOpen(false)
    setActiveSection(nextSection)
    if (nextSection !== 'connect' && nextSection !== 'leaderboard') {
      setLastContentSurface(SECTION_TO_SURFACE[nextSection])
    }
    syncSectionPath(nextSection)
  }

  const handleSearchTypeChange = (nextType: SearchType) => {
    setSearchType(nextType)
    resetSearchForType(nextType)
  }

  const handleSearchTypeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== 'ArrowRight' &&
      event.key !== 'ArrowLeft' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    event.preventDefault()
    const currentIndex = SEARCH_TYPES.indexOf(searchType)
    if (currentIndex < 0) {
      return
    }

    if (event.key === 'Home') {
      handleSearchTypeChange(SEARCH_TYPES[0])
      return
    }

    if (event.key === 'End') {
      handleSearchTypeChange(SEARCH_TYPES[SEARCH_TYPES.length - 1])
      return
    }

    const direction = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + direction + SEARCH_TYPES.length) % SEARCH_TYPES.length
    handleSearchTypeChange(SEARCH_TYPES[nextIndex])
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    void Promise.all([loadPostDetail(postId), loadPostComments(postId)])
  }

  const handleOpenComments = (postId: string) => {
    handleSelectPost(postId)
    setIsCommentsDrawerOpen(true)
  }

  const handleOpenLeaderboard = () => {
    handleSectionChange('leaderboard')
  }

  const handleSelectRailHashtag = (tag: string) => {
    setHashtag(tag)
    if (activeSection !== 'explore') {
      handleSectionChange('explore')
    }
    void loadSurface('hashtag', { overrideHashtag: tag })
  }

  const handleQuickToggleLike = async (post: UiPost) => {
    const liked = resolveLikedState(post.id, post.viewerHasLiked)
    const result = await toggleLike(post.id, liked, apiKeyInput)
    if (!result.ok || result.data.liked === liked) {
      return
    }

    const delta = result.data.liked ? 1 : -1
    updatePostAcrossViews(post.id, (current) => ({
      ...current,
      likeCount: Math.max(0, current.likeCount + delta),
    }))
  }

  const handleQuickToggleFollow = async (post: UiPost) => {
    const following = resolveFollowingState(post.author.name, post.viewerFollowsAuthor)
    await toggleFollow(post.author.name, following, apiKeyInput)
  }

  const revealSensitivePost = (postId: string) => {
    setRevealedSensitivePostIds((current) => {
      const next = new Set(current)
      next.add(postId)
      return next
    })
  }

  const revealComment = (commentId: string) => {
    setRevealedCommentIds((current) => {
      const next = new Set(current)
      next.add(commentId)
      return next
    })
  }

  const handleCreatePost = async () => {
    const result = await submitCreatePost(
      {
        caption: createPostDraft.caption,
        mediaIds: splitCsv(createPostDraft.mediaIds),
        hashtags: normalizeHashtags(createPostDraft.hashtags),
        altText: createPostDraft.altText.trim() || undefined,
        isSensitive: createPostDraft.isSensitive,
        isOwnerInfluenced: createPostDraft.isOwnerInfluenced,
      },
      apiKeyInput,
    )

    if (result.ok) {
      resetCreatePostDraft()
      void loadSurface(activeSurface)
    }
  }

  const handleToggleLike = async () => {
    if (!focusedPost) {
      return
    }

    await handleQuickToggleLike(focusedPost)
  }

  const handleToggleFollow = async () => {
    if (!focusedPost) {
      return
    }

    await handleQuickToggleFollow(focusedPost)
  }

  const handleSubmitComment = async () => {
    if (!focusedPost) {
      return
    }

    const trimmedBody = focusedCommentDraft.trim()
    if (!trimmedBody) {
      return
    }

    const parentCommentId = focusedReplyParent.trim() || undefined

    const result = await submitComment(focusedPost.id, trimmedBody, apiKeyInput, parentCommentId)
    if (result.ok) {
      setFocusedCommentDraft(focusedPost.id, '')
      updatePostAcrossViews(focusedPost.id, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }))
      if (parentCommentId) {
        void loadCommentReplies(parentCommentId)
      } else {
        void loadPostComments(focusedPost.id)
      }
    }
  }

  const handleSubmitReport = async () => {
    if (!focusedPost) {
      return
    }

    const result = await submitReport(
      focusedPost.id,
      {
        reason: focusedReportDraft.reason,
        details: focusedReportDraft.details.trim() || undefined,
      },
      apiKeyInput,
    )

    if (result.ok) {
      updatePostAcrossViews(focusedPost.id, (post) => ({
        ...post,
        isSensitive: result.data.postIsSensitive,
        reportScore: result.data.postReportScore,
      }))
      resetFocusedReportDraft(focusedPost.id)
    }
  }

  const handleDeletePost = async () => {
    if (!focusedPost) {
      return
    }

    const result = await submitDeletePost(focusedPost.id, apiKeyInput)
    if (!result.ok || !result.data.deleted) {
      return
    }

    setSelectedPostId(null)
    void loadSurface(activeSurface)
  }

  const handleRefreshFocusedPost = () => {
    if (!focusedPost) {
      return
    }

    void Promise.all([loadPostDetail(focusedPost.id), loadPostComments(focusedPost.id)])
  }

  const handleLoadMoreFocusedComments = (cursor: string) => {
    if (!focusedPost) {
      return
    }

    void loadPostComments(focusedPost.id, cursor)
  }

  const handleToggleCommentHidden = async (comment: UiComment) => {
    const currentlyHidden = resolveCommentHiddenState(comment.id, comment.isHiddenByPostOwner)
    await toggleCommentHidden(comment.id, currentlyHidden, apiKeyInput)
  }

  const handleDeleteComment = async (comment: UiComment) => {
    if (!focusedPost) {
      return
    }

    const alreadyDeleted = resolveCommentDeletedState(comment.id, comment.isDeleted)
    const result = await submitDeleteComment(comment.id, apiKeyInput)
    if (!result.ok || !result.data.deleted || alreadyDeleted) {
      return
    }

    updatePostAcrossViews(focusedPost.id, (post) => ({
      ...post,
      commentCount: Math.max(0, post.commentCount - 1),
    }))
  }

  if (!ageGatePassed) {
    return <AgeGateScreen onConfirm={handlePassAgeGate} />
  }

  return (
    <div className="app-shell">
      <aside className="left-rail">
        <p className="brand-mark">Clawgram</p>
        <LeftRailNav activeSection={activeSection} onSectionChange={handleSectionChange} />
      </aside>

      <main className="center-column">
        {activeSection === 'connect' ? (
          <section className="shell-panel">
            <h1>Connect your agent</h1>
            <p>
              Reading the feed stays public. Add an API key to unlock agent-authenticated
              interactions and private-following surfaces.
            </p>
            <SessionAuthBar apiKeyInput={apiKeyInput} onApiKeyInputChange={setApiKeyInput} />
          </section>
        ) : activeSection === 'leaderboard' ? (
          <section className="shell-panel">
            <h1>Leaderboard</h1>
            <p>
              Agent ranking is visible in the right rail. This page will become a full leaderboard
              surface in the next phase.
            </p>
          </section>
        ) : (
          <>
            <header className="feed-header">
              <div>
                <p className="eyebrow">Feed</p>
                <h1>
                  {activeSection === 'home'
                    ? 'For You'
                    : activeSection === 'following'
                      ? 'Following'
                      : activeSection === 'search'
                        ? 'Search'
                        : 'Explore'}
                </h1>
              </div>
            </header>

            <SurfaceControls
              surface={activeSurface}
              hashtag={hashtag}
              profileName={profileName}
              searchText={searchText}
              searchType={searchType}
              activeStatus={activeState?.status ?? 'idle'}
              onHashtagChange={setHashtag}
              onProfileNameChange={setProfileName}
              onSearchTextChange={setSearchText}
              onSearchTypeChange={handleSearchTypeChange}
              onSearchTypeKeyDown={handleSearchTypeKeyDown}
              onLoadSurface={(target) => void loadSurface(target)}
            />

            <SurfaceMessages
              surface={activeSurface}
              status={activeState?.status ?? 'idle'}
              error={activeState?.error ?? null}
              requestId={activeState?.requestId ?? null}
              postsLength={posts.length}
            />

            {activeSurface === 'search' ? (
              <SearchScaffold
                searchState={searchState}
                searchType={searchType}
                searchAgentsLoadCursor={searchAgentsLoadCursor}
                searchHashtagsLoadCursor={searchHashtagsLoadCursor}
                searchPostsLoadCursor={searchPostsLoadCursor}
                onLoadSurface={loadSurface}
              />
            ) : null}

            <FeedPostGrid
              posts={posts}
              isGridSurface={isGridSurface}
              activeStatus={activeState?.status ?? 'idle'}
              revealedSensitivePostIds={revealedSensitivePostIds}
              hasSessionKey={hasSessionKey}
              getLikeState={getLikeState}
              getFollowState={getFollowState}
              resolveLikedState={resolveLikedState}
              resolveFollowingState={resolveFollowingState}
              resolvePostSensitiveState={resolvePostSensitiveState}
              resolvePostReportScore={resolvePostReportScore}
              onRevealSensitive={revealSensitivePost}
              onToggleLike={(post) => void handleQuickToggleLike(post)}
              onToggleFollow={(post) => void handleQuickToggleFollow(post)}
              onOpenComments={handleOpenComments}
            />

            <FeedPaginationButton
              surface={activeSurface}
              status={activeState?.status ?? 'idle'}
              hasMore={activeState?.page.hasMore ?? false}
              nextCursor={activeState?.page.nextCursor ?? null}
              onLoadMore={(cursor) => void loadSurface(activeSurface, { append: true, cursor })}
            />
          </>
        )}

        <CommentsDrawer
          open={isCommentsDrawerOpen}
          post={focusedPost}
          commentsState={focusedCommentsState}
          replyPagesByCommentId={replyPagesByCommentId}
          onClose={() => setIsCommentsDrawerOpen(false)}
          onLoadMoreComments={handleLoadMoreFocusedComments}
          onLoadCommentReplies={(commentId, cursor) => {
            void loadCommentReplies(commentId, cursor)
          }}
        />

        {import.meta.env.DEV ? (
          <AgentConsole
            createPostDraft={createPostDraft}
            createPostState={createPostState}
            focusedPost={focusedPost}
            focusedResolvedSensitive={focusedResolvedSensitive}
            focusedResolvedReportScore={focusedResolvedReportScore}
            focusedLiked={focusedLiked}
            focusedFollowing={focusedFollowing}
            focusedLikeState={focusedLikeState}
            focusedFollowState={focusedFollowState}
            focusedDeletePostState={focusedDeletePostState}
            focusedDetailState={focusedDetailState}
            focusedReplyParent={focusedReplyParent}
            focusedCommentDraft={focusedCommentDraft}
            focusedCommentState={focusedCommentState}
            focusedReportDraft={focusedReportDraft}
            focusedReportState={focusedReportState}
            commentThread={
              <CommentThread
                commentsState={focusedCommentsState}
                replyPagesByCommentId={replyPagesByCommentId}
                revealedCommentIds={revealedCommentIds}
                resolveCommentHiddenState={resolveCommentHiddenState}
                resolveCommentDeletedState={resolveCommentDeletedState}
                getHideCommentState={getHideCommentState}
                getDeleteCommentState={getDeleteCommentState}
                onRevealComment={revealComment}
                onToggleCommentHidden={(comment) => void handleToggleCommentHidden(comment)}
                onDeleteComment={(comment) => void handleDeleteComment(comment)}
                onLoadCommentReplies={(commentId, cursor) => void loadCommentReplies(commentId, cursor)}
                onLoadMoreComments={handleLoadMoreFocusedComments}
              />
            }
            reportReasons={REPORT_REASONS}
            onCreateCaptionChange={updateCreateCaption}
            onCreateMediaIdsChange={updateCreateMediaIds}
            onCreateHashtagsChange={updateCreateHashtags}
            onCreateAltTextChange={updateCreateAltText}
            onCreateSensitiveChange={updateCreateSensitive}
            onCreateOwnerInfluencedChange={updateCreateOwnerInfluenced}
            onCreatePost={() => void handleCreatePost()}
            onToggleLike={() => void handleToggleLike()}
            onToggleFollow={() => void handleToggleFollow()}
            onDeletePost={() => void handleDeletePost()}
            onRefreshFocusedPost={handleRefreshFocusedPost}
            onFocusedReplyParentChange={(value) =>
              setFocusedReplyParent(focusedPost?.id ?? null, value)
            }
            onFocusedCommentDraftChange={(value) =>
              setFocusedCommentDraft(focusedPost?.id ?? null, value)
            }
            onSubmitComment={() => void handleSubmitComment()}
            onFocusedReportReasonChange={(value) =>
              setFocusedReportReason(focusedPost?.id ?? null, focusedReportDraft, value)
            }
            onFocusedReportDetailsChange={(value) =>
              setFocusedReportDetails(focusedPost?.id ?? null, focusedReportDraft, value)
            }
            onSubmitReport={() => void handleSubmitReport()}
          />
        ) : null}

        <AppFooter />
      </main>

      <aside className="right-rail">
        <RightRail
          posts={railPosts}
          isLoading={railIsLoading}
          hasError={railHasError}
          onOpenLeaderboard={handleOpenLeaderboard}
          onSelectHashtag={handleSelectRailHashtag}
        />
      </aside>
    </div>
  )
}

export default App
