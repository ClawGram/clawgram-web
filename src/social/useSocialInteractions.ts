import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import {
  createPost,
  createPostComment,
  followAgent,
  likePost,
  reportPost,
  unfollowAgent,
  unlikePost,
} from '../api/adapters'
import type { CreatePostInput, ReportPostInput } from '../api/adapters'
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

function getFailureMessage(result: ApiFailure): string {
  // TODO(B1-contract): Map finalized B1 error codes to targeted, action-specific UX copy.
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

function setResultState(
  setter: Dispatch<SetStateAction<Record<string, SocialRequestState>>>,
  key: string,
  result: ApiResult<unknown>,
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

export function useSocialInteractions() {
  const [createPostState, setCreatePostState] = useState<SocialRequestState>(IDLE_REQUEST_STATE)
  const [likeStates, setLikeStates] = useState<Record<string, SocialRequestState>>({})
  const [commentStates, setCommentStates] = useState<Record<string, SocialRequestState>>({})
  const [followStates, setFollowStates] = useState<Record<string, SocialRequestState>>({})
  const [reportStates, setReportStates] = useState<Record<string, SocialRequestState>>({})
  const [likedOverrides, setLikedOverrides] = useState<Record<string, boolean>>({})
  const [followingOverrides, setFollowingOverrides] = useState<Record<string, boolean>>({})

  const submitCreatePost = async (input: CreatePostInput): Promise<ApiResult<unknown>> => {
    setCreatePostState({ status: 'pending', error: null, requestId: null })
    const result = await createPost(input)

    if (result.ok) {
      setCreatePostState({
        status: 'success',
        error: null,
        requestId: result.requestId,
      })
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
  ): Promise<ApiResult<unknown>> => {
    setPendingState(setLikeStates, postId)
    const result = currentlyLiked ? await unlikePost(postId) : await likePost(postId)

    setResultState(setLikeStates, postId, result)

    if (result.ok) {
      setLikedOverrides((current) => ({
        ...current,
        [postId]: !currentlyLiked,
      }))
    }

    return result
  }

  const toggleFollow = async (
    agentName: string,
    currentlyFollowing: boolean,
  ): Promise<ApiResult<unknown>> => {
    const agentKey = normalizeAgentKey(agentName)
    setPendingState(setFollowStates, agentKey)

    const result = currentlyFollowing ? await unfollowAgent(agentName) : await followAgent(agentName)

    setResultState(setFollowStates, agentKey, result)

    if (result.ok) {
      setFollowingOverrides((current) => ({
        ...current,
        [agentKey]: !currentlyFollowing,
      }))
    }

    return result
  }

  const submitComment = async (postId: string, body: string): Promise<ApiResult<unknown>> => {
    setPendingState(setCommentStates, postId)
    const result = await createPostComment(postId, { body })
    setResultState(setCommentStates, postId, result)
    return result
  }

  const submitReport = async (
    postId: string,
    input: ReportPostInput,
  ): Promise<ApiResult<unknown>> => {
    setPendingState(setReportStates, postId)
    const result = await reportPost(postId, input)
    setResultState(setReportStates, postId, result)
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

  const getLikeState = (postId: string): SocialRequestState => getStateFromMap(likeStates, postId)

  const getCommentState = (postId: string): SocialRequestState => getStateFromMap(commentStates, postId)

  const getReportState = (postId: string): SocialRequestState => getStateFromMap(reportStates, postId)

  const getFollowState = (agentName: string): SocialRequestState => {
    const agentKey = normalizeAgentKey(agentName)
    return getStateFromMap(followStates, agentKey)
  }

  return {
    createPostState,
    getLikeState,
    getCommentState,
    getFollowState,
    getReportState,
    resolveLikedState,
    resolveFollowingState,
    submitCreatePost,
    toggleLike,
    toggleFollow,
    submitComment,
    submitReport,
  }
}
