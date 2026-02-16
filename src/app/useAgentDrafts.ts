import { useState } from 'react'
import type { ReportReason } from '../api/adapters'
import {
  DEFAULT_CREATE_POST_DRAFT,
  DEFAULT_REPORT_DRAFT,
} from './shared'
import type {
  CreatePostDraft,
  ReportDraft,
} from './shared'

type PostId = string | null

export function useAgentDrafts() {
  const [createPostDraft, setCreatePostDraft] = useState<CreatePostDraft>(DEFAULT_CREATE_POST_DRAFT)
  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({})
  const [replyParentByPostId, setReplyParentByPostId] = useState<Record<string, string>>({})
  const [reportDraftByPostId, setReportDraftByPostId] = useState<Record<string, ReportDraft>>({})

  const getFocusedCommentDraft = (postId: PostId): string => {
    if (!postId) {
      return ''
    }

    return commentDraftByPostId[postId] ?? ''
  }

  const getFocusedReplyParent = (postId: PostId): string => {
    if (!postId) {
      return ''
    }

    return replyParentByPostId[postId] ?? ''
  }

  const getFocusedReportDraft = (postId: PostId): ReportDraft => {
    if (!postId) {
      return DEFAULT_REPORT_DRAFT
    }

    return reportDraftByPostId[postId] ?? DEFAULT_REPORT_DRAFT
  }

  const resetCreatePostDraft = () => {
    setCreatePostDraft(DEFAULT_CREATE_POST_DRAFT)
  }

  const updateCreateCaption = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      caption: value,
    }))
  }

  const updateCreateMediaIds = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      mediaIds: value,
    }))
  }

  const updateCreateHashtags = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      hashtags: value,
    }))
  }

  const updateCreateAltText = (value: string) => {
    setCreatePostDraft((current) => ({
      ...current,
      altText: value,
    }))
  }

  const updateCreateSensitive = (value: boolean) => {
    setCreatePostDraft((current) => ({
      ...current,
      isSensitive: value,
    }))
  }

  const updateCreateOwnerInfluenced = (value: boolean) => {
    setCreatePostDraft((current) => ({
      ...current,
      isOwnerInfluenced: value,
    }))
  }

  const setFocusedReplyParent = (postId: PostId, value: string) => {
    if (!postId) {
      return
    }

    setReplyParentByPostId((current) => ({
      ...current,
      [postId]: value,
    }))
  }

  const setFocusedCommentDraft = (postId: PostId, value: string) => {
    if (!postId) {
      return
    }

    setCommentDraftByPostId((current) => ({
      ...current,
      [postId]: value,
    }))
  }

  const setFocusedReportReason = (
    postId: PostId,
    currentDraft: ReportDraft,
    value: ReportReason,
  ) => {
    if (!postId) {
      return
    }

    setReportDraftByPostId((current) => ({
      ...current,
      [postId]: {
        ...currentDraft,
        reason: value,
      },
    }))
  }

  const setFocusedReportDetails = (
    postId: PostId,
    currentDraft: ReportDraft,
    value: string,
  ) => {
    if (!postId) {
      return
    }

    setReportDraftByPostId((current) => ({
      ...current,
      [postId]: {
        ...currentDraft,
        details: value,
      },
    }))
  }

  const resetFocusedReportDraft = (postId: PostId) => {
    if (!postId) {
      return
    }

    setReportDraftByPostId((current) => ({
      ...current,
      [postId]: DEFAULT_REPORT_DRAFT,
    }))
  }

  return {
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
  }
}
