import { NextResponse } from "next/server"
import { extractErrorInfo, type ApiIssue, type ExtractedErrorInfo } from "@/lib/error-utils"

type ApiSuccessPayload = Record<string, unknown>
type ApiSource = ExtractedErrorInfo["source"]

interface ApiSuccessOptions {
  status?: number
  message?: string
}

interface ApiProblemOptions {
  status: number
  error: string
  detail: string
  source?: ApiSource
  issues?: ApiIssue[]
  upstream?: unknown
  extra?: Record<string, unknown>
}

export function apiSuccess(payload: ApiSuccessPayload = {}, options: ApiSuccessOptions = {}) {
  return NextResponse.json(
    {
      ok: true,
      ...payload,
      ...(options.message ? { message: options.message } : {}),
    },
    { status: options.status ?? 200 },
  )
}

export function apiProblemResponse(options: ApiProblemOptions) {
  return NextResponse.json(
    {
      ok: false,
      error: options.error,
      detail: options.detail,
      status: options.status,
      ...(options.source ? { source: options.source } : {}),
      ...(options.issues?.length ? { issues: options.issues } : {}),
      ...(options.upstream !== undefined ? { upstream: options.upstream } : {}),
      ...(options.extra ?? {}),
    },
    { status: options.status },
  )
}

export function apiValidationError(options: {
  error: string
  issues: ApiIssue[]
  detail?: string
  source?: ApiSource
  upstream?: unknown
  status?: number
  extra?: Record<string, unknown>
}) {
  return apiProblemResponse({
    status: options.status ?? 422,
    error: options.error,
    detail: options.detail ?? options.error,
    source: options.source,
    upstream: options.upstream,
    issues: options.issues,
    extra: options.extra,
  })
}

export function apiNotFound(error: string, detail?: string, source?: ApiSource) {
  return apiProblemResponse({
    status: 404,
    error,
    detail: detail ?? error,
    source,
  })
}

export function apiErrorResponse(
  error: unknown,
  options: {
    error: string
    detail: string
    status?: number
    source?: ApiSource
    extra?: Record<string, unknown>
  },
) {
  const extracted = extractErrorInfo(error, {
    fallbackDetail: options.detail,
    fallbackStatus: options.status,
    fallbackSource: options.source,
  })

  return apiProblemResponse({
    status: extracted.status,
    error: options.error,
    detail: extracted.detail,
    source: extracted.source,
    upstream: extracted.upstream,
    issues: extracted.issues,
    extra: options.extra,
  })
}
