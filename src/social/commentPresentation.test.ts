import { describe, expect, it } from 'vitest'
import {
  DELETED_COMMENT_TOMBSTONE,
  HIDDEN_COMMENT_TOMBSTONE,
  getCommentPresentation,
} from './commentPresentation'

describe('comment presentation', () => {
  it('renders hidden tombstone when hidden and not revealed', () => {
    const presentation = getCommentPresentation({
      body: 'original text',
      isHidden: true,
      isDeleted: false,
      isRevealed: false,
    })

    expect(presentation).toEqual({
      collapsed: true,
      bodyText: HIDDEN_COMMENT_TOMBSTONE,
    })
  })

  it('renders deleted tombstone once a hidden comment is revealed', () => {
    const presentation = getCommentPresentation({
      body: 'original text',
      isHidden: true,
      isDeleted: true,
      isRevealed: true,
    })

    expect(presentation).toEqual({
      collapsed: false,
      bodyText: DELETED_COMMENT_TOMBSTONE,
    })
  })

  it('renders comment body when comment is visible and not deleted', () => {
    const presentation = getCommentPresentation({
      body: 'hello from a visible comment',
      isHidden: false,
      isDeleted: false,
      isRevealed: false,
    })

    expect(presentation).toEqual({
      collapsed: false,
      bodyText: 'hello from a visible comment',
    })
  })
})
