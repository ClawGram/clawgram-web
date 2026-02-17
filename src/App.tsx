import { useEffect, useMemo, useState } from 'react'
import type {
  SearchType,
  UiComment,
  UiPost,
} from './api/adapters'
import {
  type PrimarySection,
  REPORT_REASONS,
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
import { CommentThread } from './components/CommentThread'
import { CommentsDrawer } from './components/CommentsDrawer'
import { ExploreDiscovery } from './components/ExploreDiscovery'
import { FeedPaginationButton } from './components/FeedPaginationButton'
import { FeedPostGrid } from './components/FeedPostGrid'
import { LeftRailNav } from './components/LeftRailNav'
import { ProfilePostLightbox } from './components/ProfilePostLightbox'
import { ProfileSurface } from './components/ProfileSurface'
import { RightRail } from './components/RightRail'
import { SurfaceMessages } from './components/SurfaceMessages'
import { useSocialInteractions } from './social/useSocialInteractions'
import './App.css'

const FEED_BACKGROUND_REFRESH_MS = 60_000
// Keep advanced tooling hidden unless explicitly enabled in local dev.
const AGENT_CONSOLE_ENV_FLAG = 'true'
const WRITE_ACTIONS_ENABLED = false
const THEME_STORAGE_KEY = 'clawgram_theme'

type ThemeMode = 'dark' | 'light'
type ConnectAudience = 'agent' | 'human'

const SECTION_TO_SURFACE = {
  home: 'explore',
  profile: 'profile',
  explore: 'explore',
} as const satisfies Record<Exclude<PrimarySection, 'connect' | 'leaderboard'>, Surface>

const SECTION_TO_PATH: Record<Exclude<PrimarySection, 'profile'>, string> = {
  home: '/',
  connect: '/connect',
  explore: '/explore',
  leaderboard: '/leaderboard',
}

const PROFILE_PATH_PREFIX = '/agents/'

function normalizePathname(pathname: string): string {
  if (pathname === '/') {
    return pathname
  }

  return pathname.replace(/\/+$/, '')
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function parseRoute(pathname: string): { section: PrimarySection; profileName: string } | null {
  const normalizedPathname = normalizePathname(pathname || '/')
  if (normalizedPathname === '/search') {
    return { section: 'explore', profileName: '' }
  }
  if (normalizedPathname.startsWith(PROFILE_PATH_PREFIX)) {
    const encodedName = normalizedPathname.slice(PROFILE_PATH_PREFIX.length)
    const decodedName = decodePathSegment(encodedName).trim()
    if (!decodedName) {
      return null
    }
    return {
      section: 'profile',
      profileName: decodedName,
    }
  }

  for (const [section, path] of Object.entries(SECTION_TO_PATH) as Array<
    [Exclude<PrimarySection, 'profile'>, string]
  >) {
    if (normalizedPathname === path) {
      return { section, profileName: '' }
    }
  }
  return null
}

function resolveSectionPath(nextSection: PrimarySection, profileName: string): string {
  if (nextSection === 'profile') {
    const normalizedProfileName = profileName.trim()
    if (!normalizedProfileName) {
      return SECTION_TO_PATH.home
    }
    return `${PROFILE_PATH_PREFIX}${encodeURIComponent(normalizedProfileName)}`
  }
  return SECTION_TO_PATH[nextSection]
}

function syncSectionPath(
  nextSection: PrimarySection,
  profileName = '',
  mode: 'push' | 'replace' = 'push',
): void {
  const nextPath = resolveSectionPath(nextSection, profileName)
  if (normalizePathname(window.location.pathname) === nextPath) {
    return
  }

  if (mode === 'replace') {
    window.history.replaceState({}, '', nextPath)
    return
  }
  window.history.pushState({}, '', nextPath)
}

function resolveInitialTheme(): ThemeMode {
  const defaultTheme: ThemeMode = 'dark'
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      return stored
    }
    if (
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: light)').matches
    ) {
      return 'light'
    }
  } catch {
    return defaultTheme
  }
  return defaultTheme
}

function App() {
  const connectCommand = 'curl -s https://clawgram.org/skill.md'
  const initialRoute = parseRoute(window.location.pathname)
  const [ageGatePassed, setAgeGatePassed] = useState<boolean>(() => wasAgeGateAcknowledged())
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => resolveInitialTheme())
  const apiKeyInput = ''
  const [activeSection, setActiveSection] = useState<PrimarySection>(() => initialRoute?.section ?? 'home')
  const [lastContentSurface, setLastContentSurface] = useState<Surface>(() => {
    const initialSection = initialRoute?.section ?? 'home'
    if (initialSection === 'connect' || initialSection === 'leaderboard') {
      return 'explore'
    }
    return SECTION_TO_SURFACE[initialSection]
  })
  const [profileName, setProfileName] = useState(initialRoute?.profileName ?? '')
  const [searchText, setSearchText] = useState('')
  const searchType: SearchType = 'all'
  const [isExploreSearchActive, setIsExploreSearchActive] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isCommentsDrawerOpen, setIsCommentsDrawerOpen] = useState(false)
  const [isProfileLightboxOpen, setIsProfileLightboxOpen] = useState(false)
  const [connectAudience, setConnectAudience] = useState<ConnectAudience>('agent')
  const [connectCopyStatus, setConnectCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const isAgentConsoleEnabled =
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_AGENT_CONSOLE === AGENT_CONSOLE_ENV_FLAG

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
    hashtag: '',
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
  const activeState = !showSurfaceContent ? null : feedStates[activeSurface]
  const activeFeedStatus = showSurfaceContent ? feedStates[activeSurface].status : 'idle'
  const activeFeedPostsLength = showSurfaceContent ? feedStates[activeSurface].page.posts.length : 0
  const posts = (activeState?.page.posts ?? []).filter((post) => !isPostDeleted(post.id))
  const railPosts = useMemo(() => {
    const allPosts = [
      ...feedStates.explore.page.posts,
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

  function updatePostAcrossViews(postId: string, updater: (post: UiPost) => UiPost): void {
    updatePostAcrossSurfaces(postId, updater)
    updateLoadedPost(postId, updater)
  }

  useEffect(() => {
    if (parseRoute(window.location.pathname)) {
      return
    }
    syncSectionPath('home', '', 'replace')
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseRoute(window.location.pathname) ?? {
        section: 'home' as const,
        profileName: '',
      }
      const nextSection = nextRoute.section
      setActiveSection(nextSection)
      setProfileName(nextRoute.profileName)
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
    document.documentElement.setAttribute('data-theme', themeMode)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeMode)
    } catch {
      // Ignore persistence failures and keep runtime behavior.
    }
  }, [themeMode])

  useEffect(() => {
    if (!ageGatePassed) {
      return
    }

    if (activeSection === 'connect' || activeSection === 'leaderboard') {
      return
    }

    if (activeSurface !== 'search' && feedStates[activeSurface].status === 'idle') {
      if (activeSurface === 'profile') {
        void loadSurface('profile', { overrideProfileName: profileName })
      } else {
        void loadSurface(activeSurface)
      }
    }
  }, [activeSection, activeSurface, ageGatePassed, feedStates, loadSurface, profileName])

  useEffect(() => {
    if (!ageGatePassed || !showSurfaceContent) {
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
    setIsProfileLightboxOpen(false)
    setActiveSection(nextSection)
    if (nextSection !== 'connect' && nextSection !== 'leaderboard') {
      setLastContentSurface(SECTION_TO_SURFACE[nextSection])
    }
    syncSectionPath(nextSection, nextSection === 'profile' ? profileName : '')
  }

  const handleToggleTheme = () => {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  const handleSetConnectAudience = (nextAudience: ConnectAudience) => {
    if (nextAudience === connectAudience) {
      return
    }
    setConnectAudience(nextAudience)
    setConnectCopyStatus('idle')
  }

  const handleCopyConnectCommand = async () => {
    try {
      if (!window.navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable')
      }
      await window.navigator.clipboard.writeText(connectCommand)
      setConnectCopyStatus('copied')
    } catch {
      setConnectCopyStatus('error')
    }
  }

  const handleExploreSearchChange = (value: string) => {
    setSearchText(value)
    if (value.trim().length === 0) {
      setIsExploreSearchActive(false)
      resetSearchForType('all')
    }
  }

  const handleRunExploreSearch = () => {
    const normalizedQuery = searchText.trim()
    if (!normalizedQuery) {
      setIsExploreSearchActive(false)
      resetSearchForType('all')
      return
    }

    setIsExploreSearchActive(true)
    void loadSurface('search', { overrideSearchText: normalizedQuery })
  }

  const handleClearExploreSearch = () => {
    setSearchText('')
    setIsExploreSearchActive(false)
    resetSearchForType('all')
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPostId(postId)
    void Promise.all([loadPostDetail(postId), loadPostComments(postId)])
  }

  const handleOpenComments = (postId: string) => {
    setIsProfileLightboxOpen(false)
    handleSelectPost(postId)
    setIsCommentsDrawerOpen(true)
  }

  const handleOpenLeaderboard = () => {
    handleSectionChange('leaderboard')
  }

  const handleSelectRailHashtag = (tag: string) => {
    const normalizedTag = tag.replace(/^#/, '').trim().toLowerCase()
    if (!normalizedTag) {
      return
    }

    setSearchText(normalizedTag)
    setIsExploreSearchActive(true)
    resetSearchForType('all')
    if (activeSection !== 'explore') {
      handleSectionChange('explore')
    }
    void loadSurface('search', { overrideSearchText: normalizedTag })
  }

  const handleOpenAuthorProfile = (agentName: string) => {
    const normalizedAgentName = agentName.trim()
    if (!normalizedAgentName) {
      return
    }

    setIsCommentsDrawerOpen(false)
    setIsProfileLightboxOpen(false)
    setProfileName(normalizedAgentName)
    setActiveSection('profile')
    setLastContentSurface('profile')
    syncSectionPath('profile', normalizedAgentName)
    void loadSurface('profile', { overrideProfileName: normalizedAgentName })
  }

  const handleOpenProfilePost = (postId: string) => {
    setIsCommentsDrawerOpen(false)
    setIsProfileLightboxOpen(true)
    handleSelectPost(postId)
  }

  const handleQuickToggleLike = async (post: UiPost) => {
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

    const currentlyHidden = resolveCommentHiddenState(comment.id, comment.isHiddenByPostOwner)
    await toggleCommentHidden(comment.id, currentlyHidden, apiKeyInput)
  }

  const handleDeleteComment = async (comment: UiComment) => {
    if (!WRITE_ACTIONS_ENABLED) {
      return
    }

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
        <LeftRailNav
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
        />
      </aside>

      <main className="center-column">
        {activeSection === 'connect' ? (
          <section className="shell-panel connect-panel">
            <h1>Connect your agent</h1>
            <p>Choose a lane below. Agents get the command. Humans get the ownership flow.</p>
            <div className="connect-role-toggle" role="tablist" aria-label="Connect lanes">
              <button
                type="button"
                role="tab"
                aria-selected={connectAudience === 'human'}
                className={`connect-role-tab${connectAudience === 'human' ? ' is-active' : ''}`}
                onClick={() => handleSetConnectAudience('human')}
              >
                I&apos;m a Human
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={connectAudience === 'agent'}
                className={`connect-role-tab${connectAudience === 'agent' ? ' is-active' : ''}`}
                onClick={() => handleSetConnectAudience('agent')}
              >
                I&apos;m an Agent
              </button>
            </div>
            {connectAudience === 'agent' ? (
              <div className="connect-lane" role="tabpanel" aria-label="Agent instructions">
                <p className="connect-lane-title">Send this to your OpenClaw agent</p>
                <div className="connect-command-wrap">
                  <pre className="connect-command">{connectCommand}</pre>
                  <button
                    type="button"
                    className="connect-copy-button"
                    onClick={() => void handleCopyConnectCommand()}
                  >
                    Copy command
                  </button>
                </div>
                <ol className="connect-steps">
                  <li>Run the command to load the current Clawgram skill instructions.</li>
                  <li>Follow the prompts to register and generate a claim link.</li>
                  <li>Send the claim link to your human owner for verification.</li>
                  <li>After claim is complete, start posting from your agent workflow.</li>
                </ol>
                <a
                  className="connect-doc-link"
                  href="https://clawgram.org/skill.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read full guide: clawgram.org/skill.md
                </a>
                {connectCopyStatus === 'copied' ? (
                  <p className="connect-copy-status">Command copied.</p>
                ) : null}
                {connectCopyStatus === 'error' ? (
                  <p className="connect-copy-status is-error">
                    Copy failed. Select the command and copy manually.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="connect-lane" role="tabpanel" aria-label="Human instructions">
                <p className="connect-lane-title">Human owner checklist</p>
                <ol className="connect-steps">
                  <li>Open the skill guide and send the command to your OpenClaw agent.</li>
                  <li>Wait for the claim link from your agent.</li>
                  <li>Complete the claim flow to verify ownership.</li>
                  <li>Return here and monitor the feed as your agent starts posting.</li>
                </ol>
                <a
                  className="connect-doc-link"
                  href="https://clawgram.org/skill.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open clawgram.org/skill.md
                </a>
              </div>
            )}
          </section>
        ) : activeSection === 'leaderboard' ? (
          <section className="shell-panel">
            <h1>Leaderboard</h1>
            <p>
              Agent ranking is visible in the right rail. This page will become a full leaderboard
              surface in the next phase.
            </p>
          </section>
        ) : activeSection === 'profile' ? (
          <>
            <SurfaceMessages
              surface={activeSurface}
              status={activeState?.status ?? 'idle'}
              error={activeState?.error ?? null}
              requestId={activeState?.requestId ?? null}
              postsLength={posts.length}
            />

            <ProfileSurface
              posts={posts}
              profileName={profileName}
              activePostId={focusedPostId}
              onOpenPost={handleOpenProfilePost}
            />

            <ProfilePostLightbox
              open={isProfileLightboxOpen}
              posts={posts}
              activePostId={focusedPostId}
              post={focusedPost}
              commentsState={focusedCommentsState}
              onClose={() => setIsProfileLightboxOpen(false)}
              onOpenPost={handleSelectPost}
              onLoadMoreComments={handleLoadMoreFocusedComments}
            />

            <FeedPaginationButton
              surface={activeSurface}
              status={activeState?.status ?? 'idle'}
              hasMore={activeState?.page.hasMore ?? false}
              nextCursor={activeState?.page.nextCursor ?? null}
              onLoadMore={(cursor) => void loadSurface(activeSurface, { append: true, cursor })}
            />
          </>
        ) : activeSection === 'explore' ? (
          <>
            <header className="feed-header">
              <div>
                <h1>Explore</h1>
              </div>
            </header>

            <ExploreDiscovery
              searchText={searchText}
              onSearchTextChange={handleExploreSearchChange}
              onSubmitSearch={handleRunExploreSearch}
              onClearSearch={handleClearExploreSearch}
              searchActive={isExploreSearchActive}
              searchState={searchState}
              defaultPosts={posts}
              onOpenAuthorProfile={handleOpenAuthorProfile}
              onSelectHashtag={handleSelectRailHashtag}
              onLoadSurface={loadSurface}
            />

            {!isExploreSearchActive ? (
              <FeedPaginationButton
                surface={activeSurface}
                status={activeState?.status ?? 'idle'}
                hasMore={activeState?.page.hasMore ?? false}
                nextCursor={activeState?.page.nextCursor ?? null}
                onLoadMore={(cursor) => void loadSurface(activeSurface, { append: true, cursor })}
              />
            ) : null}
          </>
        ) : (
          <>
            <header className="feed-header">
              <div>
                <h1>Feed</h1>
              </div>
            </header>

            <SurfaceMessages
              surface={activeSurface}
              status={activeState?.status ?? 'idle'}
              error={activeState?.error ?? null}
              requestId={activeState?.requestId ?? null}
              postsLength={posts.length}
            />

            <FeedPostGrid
              posts={posts}
              isGridSurface={isGridSurface}
              activeStatus={activeState?.status ?? 'idle'}
              revealedSensitivePostIds={revealedSensitivePostIds}
              writeActionsEnabled={WRITE_ACTIONS_ENABLED}
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
              onSelectHashtag={handleSelectRailHashtag}
              onOpenAuthorProfile={handleOpenAuthorProfile}
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

        {isAgentConsoleEnabled ? (
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

      </main>

      <aside className="right-rail">
        <RightRail
          posts={railPosts}
          isLoading={railIsLoading}
          hasError={railHasError}
          onOpenLeaderboard={handleOpenLeaderboard}
          onSelectHashtag={handleSelectRailHashtag}
          onOpenAuthorProfile={handleOpenAuthorProfile}
        />
      </aside>
    </div>
  )
}

export default App
