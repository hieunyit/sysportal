import { ZodError } from "zod"
import { KeycloakApiError } from "@/lib/keycloak-admin"
import { OpenVpnApiError } from "@/lib/openvpn-admin"

export interface ApiIssue {
  path: string
  message: string
}

export interface ExtractedErrorInfo {
  status: number
  source: "app" | "keycloak" | "openvpn"
  detail: string
  issues?: ApiIssue[]
  upstream?: unknown
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeIssuePath(path: unknown) {
  if (Array.isArray(path)) {
    return path
      .map((segment) => String(segment ?? "").trim())
      .filter(Boolean)
      .join(".")
  }

  return isNonEmptyString(path) ? path.trim() : "request"
}

function readPrimitiveEntries(payload: Record<string, unknown>) {
  return Object.entries(payload)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
}

export function normalizeIssues(value: unknown): ApiIssue[] | undefined {
  if (!Array.isArray(value)) {
    return undefined
  }

  const issues = value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const issue = entry as { path?: unknown; message?: unknown }
      const message = isNonEmptyString(issue.message) ? issue.message.trim() : ""

      if (!message) {
        return null
      }

      return {
        path: normalizeIssuePath(issue.path),
        message,
      } satisfies ApiIssue
    })
    .filter((issue): issue is ApiIssue => issue !== null)

  return issues.length > 0 ? issues : undefined
}

export function readPayloadMessage(payload: unknown, fallback: string) {
  if (isNonEmptyString(payload)) {
    return payload.trim()
  }

  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const record = payload as Record<string, unknown>
  const directKeys = [
    "detail",
    "error_description",
    "reason",
    "error",
    "message",
    "title",
    "description",
  ]

  for (const key of directKeys) {
    const value = record[key]

    if (isNonEmptyString(value)) {
      return value.trim()
    }
  }

  const issues = normalizeIssues(record.issues)

  if (issues?.length) {
    return issues
      .map((issue) => (issue.path && issue.path !== "request" ? `${issue.path}: ${issue.message}` : issue.message))
      .join("; ")
  }

  const primitives = readPrimitiveEntries(record)
  return primitives.length > 0 ? primitives.join(", ") : fallback
}

export function extractErrorInfo(
  error: unknown,
  options: {
    fallbackDetail: string
    fallbackStatus?: number
    fallbackSource?: ExtractedErrorInfo["source"]
  },
): ExtractedErrorInfo {
  const fallbackStatus = options.fallbackStatus ?? 500
  const fallbackSource = options.fallbackSource ?? "app"

  if (error instanceof KeycloakApiError) {
    return {
      status: error.status || fallbackStatus,
      source: "keycloak",
      detail: readPayloadMessage(error.payload ?? error.detail, options.fallbackDetail),
      upstream: error.payload,
      issues: normalizeIssues(error.payload && typeof error.payload === "object" ? (error.payload as Record<string, unknown>).issues : undefined),
    }
  }

  if (error instanceof OpenVpnApiError) {
    return {
      status: error.status || fallbackStatus,
      source: "openvpn",
      detail: readPayloadMessage(error.payload ?? error.detail, options.fallbackDetail),
      upstream: error.payload,
      issues: normalizeIssues(error.payload && typeof error.payload === "object" ? (error.payload as Record<string, unknown>).issues : undefined),
    }
  }

  if (error instanceof ZodError) {
    return {
      status: 422,
      source: fallbackSource,
      detail: options.fallbackDetail,
      issues: error.issues.map((issue) => ({
        path: normalizeIssuePath(issue.path),
        message: issue.message,
      })),
    }
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>
    const issues = normalizeIssues(record.issues)

    return {
      status:
        typeof record.status === "number" && Number.isFinite(record.status) ? record.status : fallbackStatus,
      source:
        record.source === "keycloak" || record.source === "openvpn" || record.source === "app"
          ? record.source
          : fallbackSource,
      detail: readPayloadMessage(record.upstream ?? record.payload ?? error, options.fallbackDetail),
      upstream: record.upstream ?? record.payload,
      issues,
    }
  }

  if (error instanceof Error && isNonEmptyString(error.message)) {
    return {
      status: fallbackStatus,
      source: fallbackSource,
      detail: error.message.trim(),
    }
  }

  return {
    status: fallbackStatus,
    source: fallbackSource,
    detail: options.fallbackDetail,
  }
}

export function getErrorDetail(error: unknown, fallback: string) {
  return extractErrorInfo(error, { fallbackDetail: fallback }).detail
}
