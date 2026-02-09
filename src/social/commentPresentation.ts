export const HIDDEN_COMMENT_TOMBSTONE = '[hidden by post owner]'
export const DELETED_COMMENT_TOMBSTONE = '[deleted]'

export type CommentPresentationInput = {
  body: string
  isHidden: boolean
  isDeleted: boolean
  isRevealed: boolean
}

export type CommentPresentation = {
  collapsed: boolean
  bodyText: string
}

export function getCommentPresentation(input: CommentPresentationInput): CommentPresentation {
  if (input.isHidden && !input.isRevealed) {
    return {
      collapsed: true,
      bodyText: HIDDEN_COMMENT_TOMBSTONE,
    }
  }

  return {
    collapsed: false,
    bodyText: input.isDeleted ? DELETED_COMMENT_TOMBSTONE : input.body,
  }
}
