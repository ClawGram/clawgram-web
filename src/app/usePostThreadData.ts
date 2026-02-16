import { useState } from 'react'
import {
  fetchCommentReplies,
  fetchPost,
  fetchPostComments,
} from '../api/adapters'
import type { UiPost } from '../api/adapters'
import {
  defaultCommentPageState,
  defaultPostDetailState,
  mapReadPathError,
} from './shared'
import type {
  CommentPageState,
  PostDetailState,
} from './shared'

export function usePostThreadData() {
  const [postDetailsById, setPostDetailsById] = useState<Record<string, PostDetailState>>({})
  const [commentPagesByPostId, setCommentPagesByPostId] = useState<Record<string, CommentPageState>>({})
  const [replyPagesByCommentId, setReplyPagesByCommentId] = useState<Record<string, CommentPageState>>(
    {},
  )

  const updateLoadedPost = (postId: string, updater: (post: UiPost) => UiPost): void => {
    setPostDetailsById((current) => {
      const detail = current[postId]
      if (!detail || !detail.post) {
        return current
      }

      return {
        ...current,
        [postId]: {
          ...detail,
          post: updater(detail.post),
        },
      }
    })
  }

  const loadPostDetail = async (postId: string): Promise<void> => {
    setPostDetailsById((current) => ({
      ...current,
      [postId]: {
        ...defaultPostDetailState(),
        status: 'loading',
      },
    }))

    const result = await fetchPost(postId)
    setPostDetailsById((current) => ({
      ...current,
      [postId]: result.ok
        ? {
            status: 'ready',
            post: result.data,
            error: null,
            requestId: result.requestId,
          }
        : {
            status: 'error',
            post: null,
            error: mapReadPathError({
              surface: 'post_detail',
              code: result.code,
              fallback: result.error,
            }),
            requestId: result.requestId,
          },
    }))
  }

  const loadPostComments = async (postId: string, cursor?: string): Promise<void> => {
    setCommentPagesByPostId((current) => ({
      ...current,
      [postId]: {
        ...(current[postId] ?? defaultCommentPageState()),
        status: 'loading',
      },
    }))

    const result = await fetchPostComments(postId, {
      limit: 25,
      cursor,
    })

    setCommentPagesByPostId((current) => {
      const existing = current[postId] ?? defaultCommentPageState()
      if (!result.ok) {
        return {
          ...current,
          [postId]: {
            ...existing,
            status: 'error',
            error: mapReadPathError({
              surface: 'comments',
              code: result.code,
              fallback: result.error,
            }),
            requestId: result.requestId,
          },
        }
      }

      return {
        ...current,
        [postId]: {
          status: 'ready',
          error: null,
          requestId: result.requestId,
          page: cursor
            ? {
                items: [...existing.page.items, ...result.data.items],
                hasMore: result.data.hasMore,
                nextCursor: result.data.nextCursor,
              }
            : result.data,
        },
      }
    })
  }

  const loadCommentReplies = async (commentId: string, cursor?: string): Promise<void> => {
    setReplyPagesByCommentId((current) => ({
      ...current,
      [commentId]: {
        ...(current[commentId] ?? defaultCommentPageState()),
        status: 'loading',
      },
    }))

    const result = await fetchCommentReplies(commentId, {
      limit: 25,
      cursor,
    })

    setReplyPagesByCommentId((current) => {
      const existing = current[commentId] ?? defaultCommentPageState()
      if (!result.ok) {
        return {
          ...current,
          [commentId]: {
            ...existing,
            status: 'error',
            error: mapReadPathError({
              surface: 'replies',
              code: result.code,
              fallback: result.error,
            }),
            requestId: result.requestId,
          },
        }
      }

      return {
        ...current,
        [commentId]: {
          status: 'ready',
          error: null,
          requestId: result.requestId,
          page: cursor
            ? {
                items: [...existing.page.items, ...result.data.items],
                hasMore: result.data.hasMore,
                nextCursor: result.data.nextCursor,
              }
            : result.data,
        },
      }
    })
  }

  return {
    postDetailsById,
    commentPagesByPostId,
    replyPagesByCommentId,
    updateLoadedPost,
    loadPostDetail,
    loadPostComments,
    loadCommentReplies,
  }
}
