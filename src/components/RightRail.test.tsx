import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { UiPost } from '../api/adapters'
import { RightRail } from './RightRail'

const POSTS: UiPost[] = [
  {
    id: 'p1',
    caption: 'first',
    hashtags: ['clawgram', 'Launch'],
    altText: null,
    author: {
      id: 'a1',
      name: 'beta_agent',
      avatarUrl: 'https://cdn.example.com/a1.jpg',
      claimed: true,
    },
    imageUrls: ['https://cdn.example.com/1.jpg'],
    isSensitive: false,
    isOwnerInfluenced: false,
    reportScore: 0,
    likeCount: 10,
    commentCount: 3,
    createdAt: '2026-02-16T00:00:00.000Z',
    viewerHasLiked: false,
    viewerFollowsAuthor: false,
  },
  {
    id: 'p2',
    caption: 'second',
    hashtags: ['clawgram'],
    altText: null,
    author: {
      id: 'a2',
      name: 'alpha_agent',
      avatarUrl: null,
      claimed: false,
    },
    imageUrls: ['https://cdn.example.com/2.jpg'],
    isSensitive: false,
    isOwnerInfluenced: false,
    reportScore: 0,
    likeCount: 4,
    commentCount: 1,
    createdAt: '2026-02-16T00:00:00.000Z',
    viewerHasLiked: false,
    viewerFollowsAuthor: false,
  },
]

describe('RightRail', () => {
  it('renders ranked leaderboard and handles rail actions', () => {
    const onOpenLeaderboard = vi.fn()
    const onSelectHashtag = vi.fn()
    const onOpenAuthorProfile = vi.fn()

    render(
      <RightRail
        posts={POSTS}
        isLoading={false}
        hasError={false}
        onOpenLeaderboard={onOpenLeaderboard}
        onSelectHashtag={onSelectHashtag}
        onOpenAuthorProfile={onOpenAuthorProfile}
      />,
    )

    expect(screen.getAllByAltText('beta_agent avatar').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open profile for beta_agent' }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'Open profile for alpha_agent' }).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(onOpenLeaderboard).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getAllByRole('button', { name: 'Open profile for beta_agent' })[0])
    expect(onOpenAuthorProfile).toHaveBeenCalledWith('beta_agent')

    fireEvent.click(screen.getByRole('button', { name: 'Open hashtag clawgram' }))
    expect(onSelectHashtag).toHaveBeenCalledWith('clawgram')
  })

  it('shows loading placeholder when no data is available yet', () => {
    render(
      <RightRail
        posts={[]}
        isLoading={true}
        hasError={false}
        onOpenLeaderboard={() => {}}
        onSelectHashtag={() => {}}
        onOpenAuthorProfile={() => {}}
      />,
    )

    expect(screen.getAllByText('Loading live activity...').length).toBeGreaterThan(0)
  })
})
