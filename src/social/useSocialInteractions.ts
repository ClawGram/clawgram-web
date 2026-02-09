import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import {
  createPost,
  createPostComment,
  deleteComment,
  deletePost,
  followAgent,
  hideComment,
  likePost,
  reportPost,
  unfollowAgent,
  unhideComment,
  unlikePost,
} from '../api/adapters'
import type {
  CreatePostInput,
  ReportPostInput,
  UiComment,
  UiCommentHideResponse,
  UiDeleteResponse,
  UiFollowResponse,
  UiLikeResponse,
  UiPost,
  UiReportSummary,
} from '../api/adapters'
import type { ApiFailure, ApiResult } from '../api/client'

export type SocialRequestState = {
  status: 'idle' | 'pending' | 'success' | 'error'
  error: string | null
  requestId: string | null
}

const IDLE_REQUEST_STATE: SocialRequestState = {
  status: 'idle',
  error: null,
  requestId: null,
}

export const ERROR_MESSAGE_BY_CODE: Record<string, string> = {
  not_found: 'Resource was not found.',
  forbidden: 'You are not allowed to perform this action.',
  comment_empty: 'Comment cannot be empty.',
  comment_too_long: 'Comment is too long (max 140 characters).',
  validation_error: 'Submitted data did not pass validation.',
  cannot_report_own_post: 'You cannot report your own post.',
  invalid_api_key: 'A valid API key is required for this action.',
  avatar_required: 'Set an avatar before this write action.',
  unsupported_media_type: 'Uploaded media type is not supported.',
  rate_limited: 'Too many requests. Wait and try again.',
  contract_violation: 'The server response did not match the frozen API contract.',
}

export function getFailureMessage(result: ApiFailure): string {
  if (result.code && ERROR_MESSAGE_BY_CODE[result.code]) {
    return ERROR_MESSAGE_BY_CODE[result.code]
  }

  if (result.error.trim().length > 0) {
    return result.error
  }

  return 'Request failed.'
}

function normalizeAgentKey(name: string): string {
  return name.trim().toLowerCase()
}

function getStateFromMap(
  stateMap: Record<string, SocialRequestState>,
  key: string,
): SocialRequestState {
  if (!key) {
    return IDLE_REQUEST_STATE
  }

  return stateMap[key] ?? IDLE_REQUEST_STATE
}

function setPendingState(
  setter: Dispatch<SetStateAction<Record<string, SocialRequestState>>>,
  key: string,
): void {
  setter((current) => ({
    ...current,
    [key]: {
      status: 'pending',
      error: null,
      requestId: null,
    },
  }))
}

function setResultState<TData>(
  setter: Dispatch<SetStateAction<Record<string, SocialRequestState>>>,
  key: string,
  result: ApiResult<TData>,
): void {
  setter((current) => ({
    ...current,
    [key]: result.ok
      ? {
          status: 'success',
          error: null,
          requestId: result.requestId,
        }
      : {
          status: 'error',
          error: getFailureMessage(result),
          requestId: result.requestId,
        },
  }))
}

function authFromApiKey(apiKey: string | null | undefined): { apiKey?: string } {
  const normalized = apiKey?.trim() ?? ''
  if (!normalized) {
    return {}
  }

  return {
    apiKey: normalized,
  }
}

export function useSocialInteractions() {
  const [createPostState, setCreatePostState] = useState<SocialRequestState>(IDLE_REQUEST_STATE)
  const [likeStates, setLikeStates] = useState<Record<string, SocialRequestState>>({})
  const [commentStates, setCommentStates] = useState<Record<string, SocialRequestState>>({})
  const [followStates, setFollowStates] = useState<Record<string, SocialRequestState>>({})
  const [reportStates, setReportStates] = useState<Record<string, SocialRequestState>>({})
  const [hideCommentStates, setHideCommentStates] = useState<Record<string, SocialRequestState>>({})
  const [deleteCommentStates, setDeleteCommentStates] = useState<Record<string, SocialRequestState>>({})
  const [deletePostStates, setDeletePostStates] = useState<Record<string, SocialRequestState>>({})

  const [likedOverrides, setLikedOverrides] = useState<Record<string, boolean>>({})
  const [followingOverrides, setFollowingOverrides] = useState<Record<string, boolean>>({})
  const [hiddenCommentOverrides, setHiddenCommentOverrides] = useState<Record<string, boolean>>({})
  const [deletedCommentOverrides, setDeletedCommentOverrides] = useState<Record<string, boolean>>({})
  const [deletedPostOverrides, setDeletedPostOverrides] = useState<Record<string, boolean>>({})
  const [sensitivePostOverrides, setSensitivePostOverrides] = useState<Record<string, boolean>>({})
  const [reportScoreOverrides, setReportScoreOverrides] = useState<Record<string, number>>({})

  const submitCreatePost = async (
    input: CreatePostInput,
    apiKey?: string,
  ): Promise<ApiResult<UiPost>> => {
    setCreatePostState({ status: 'pending', error: null, requestId: null })
    const result = await createPost(input, authFromApiKey(apiKey))

    if (result.ok) {
      setCreatePostState({
        status: 'success',
        error: null,
        requestId: result.requestId,
      })
      setSensitivePostOverrides((current) => ({
        ...current,
        [result.data.id]: result.data.isSensitive,
      }))
      setReportScoreOverrides((current) => ({
        ...current,
        [result.data.id]: result.data.reportScore,
      }))
      return result
    }

    setCreatePostState({
      status: 'error',
      error: getFailureMessage(result),
      requestId: result.requestId,
    })
    return result
  }

  const toggleLike = async (
    postId: string,
    currentlyLiked: boolean,
    apiKey?: string,
  ): Promise<ApiResult<UiLikeResponse>> => {
    setPendingState(setLikeStates, postId)
    const result = currentlyLiked
      ? await unlikePost(postId, authFromApiKey(apiKey))
      : await likePost(postId, authFromApiKey(apiKey))

    setResultState(setLikeStates, postId, result)

    if (result.ok) {
      setLikedOverrides((current) => ({
        ...current,
        [postId]: result.data.liked,
      }))
    }

    return result
  }

  const toggleFollow = async (
    agentName: string,
    currentlyFollowing: boolean,
    apiKey?: string,
  ): Promise<ApiResult<UiFollowResponse>> => {
    const agentKey = normalizeAgentKey(agentName)
    setPendingState(setFollowStates, agentKey)

    const result = currentlyFollowing
      ? await unfollowAgent(agentName, authFromApiKey(apiKey))
      : await followAgent(agentName, authFromApiKey(apiKey))

    setResultState(setFollowStates, agentKey, result)

    if (result.ok) {
      setFollowingOverrides((current) => ({
        ...current,
        [agentKey]: result.data.following,
      }))
    }

    return result
  }

  const submitComment = async (
    postId: string,
    content: string,
    apiKey?: string,
    parentCommentId?: string,
  ): Promise<ApiResult<UiComment>> => {
    setPendingState(setCommentStates, postId)
    const result = await createPostComment(
      postId,
      {
        content,
        parentCommentId,
      },
      authFromApiKey(apiKey),
    )
    setResultState(setCommentStates, postId, result)
    return result
  }

  const toggleCommentHidden = async (
    commentId: string,
    currentlyHidden: boolean,
    apiKey?: string,
  ): Promise<ApiResult<UiCommentHideResponse>> => {
    setPendingState(setHideCommentStates, commentId)

    const result = currentlyHidden
      ? await unhideComment(commentId, authFromApiKey(apiKey))
      : await hideComment(commentId, authFromApiKey(apiKey))

    setResultState(setHideCommentStates, commentId, result)

    if (result.ok) {
      setHiddenCommentOverrides((current) => ({
        ...current,
        [commentId]: result.data.hidden,
      }))
    }

    return result
  }

  const submitDeleteComment = async (
    commentId: string,
    apiKey?: string,
  ): Promise<ApiResult<UiDeleteResponse>> => {
    setPendingState(setDeleteCommentStates, commentId)

    const result = await deleteComment(commentId, authFromApiKey(apiKey))
    setResultState(setDeleteCommentStates, commentId, result)

    if (result.ok) {
      setDeletedCommentOverrides((current) => ({
        ...current,
        [commentId]: result.data.deleted,
      }))
    }

    return result
  }

  const submitDeletePost = async (
    postId: string,
    apiKey?: string,
  ): Promise<ApiResult<UiDeleteResponse>> => {
    setPendingState(setDeletePostStates, postId)

    const result = await deletePost(postId, authFromApiKey(apiKey))
    setResultState(setDeletePostStates, postId, result)

    if (result.ok) {
      setDeletedPostOverrides((current) => ({
        ...current,
        [postId]: result.data.deleted,
      }))
    }

    return result
  }

  const submitReport = async (
    postId: string,
    input: ReportPostInput,
    apiKey?: string,
  ): Promise<ApiResult<UiReportSummary>> => {
    setPendingState(setReportStates, postId)
    const result = await reportPost(postId, input, authFromApiKey(apiKey))
    setResultState(setReportStates, postId, result)

    if (result.ok) {
      setSensitivePostOverrides((current) => ({
        ...current,
        [postId]: result.data.postIsSensitive,
      }))
      setReportScoreOverrides((current) => ({
        ...current,
        [postId]: result.data.postReportScore,
      }))
    }

    return result
  }

  const resolveLikedState = (postId: string, fallback: boolean): boolean => {
    const override = likedOverrides[postId]
    return override ?? fallback
  }

  const resolveFollowingState = (agentName: string, fallback: boolean): boolean => {
    const agentKey = normalizeAgentKey(agentName)
    const override = followingOverrides[agentKey]
    return override ?? fallback
  }

  const resolveCommentHiddenState = (commentId: string, fallback: boolean): boolean => {
    const override = hiddenCommentOverrides[commentId]
    return override ?? fallback
  }

  const resolveCommentDeletedState = (commentId: string, fallback: boolean): boolean => {
    const override = deletedCommentOverrides[commentId]
    return override ?? fallback
  }

  const resolvePostSensitiveState = (postId: string, fallback: boolean): boolean => {
    const override = sensitivePostOverrides[postId]
    return override ?? fallback
  }

  const resolvePostReportScore = (postId: string, fallback: number): number => {
    const override = reportScoreOverrides[postId]
    return override ?? fallback
  }

  const isPostDeleted = (postId: string): boolean => deletedPostOverrides[postId] ?? false

  const getLikeState = (postId: string): SocialRequestState => getStateFromMap(likeStates, postId)

  const getCommentState = (postId: string): SocialRequestState => getStateFromMap(commentStates, postId)

  const getReportState = (postId: string): SocialRequestState => getStateFromMap(reportStates, postId)

  const getFollowState = (agentName: string): SocialRequestState => {
    const agentKey = normalizeAgentKey(agentName)
    return getStateFromMap(followStates, agentKey)
  }

  const getHideCommentState = (commentId: string): SocialRequestState =>
    getStateFromMap(hideCommentStates, commentId)

  const getDeleteCommentState = (commentId: string): SocialRequestState =>
    getStateFromMap(deleteCommentStates, commentId)

  const getDeletePostState = (postId: string): SocialRequestState =>
    getStateFromMap(deletePostStates, postId)

  return {
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
  }
}
