export interface ApiIssue {
  path?: string
  message?: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function normalizeIssues(value: unknown): ApiIssue[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null
      }

      const issue = entry as ApiIssue
      return isNonEmptyString(issue.message) ? issue : null
    })
    .filter((issue): issue is ApiIssue => issue !== null)
}

function formatIssues(issues: ApiIssue[]) {
  return issues
    .map((issue) => {
      const path = issue.path?.trim()
      const message = issue.message?.trim()
      return path ? `${path}: ${message}` : message
    })
    .filter(Boolean)
    .join("; ")
}

function readNestedMessage(payload: unknown) {
  if (isNonEmptyString(payload)) {
    return payload.trim()
  }

  if (!payload || typeof payload !== "object") {
    return ""
  }

  const record = payload as Record<string, unknown>
  const directKeys = ["detail", "error_description", "reason", "error", "message", "title", "description"]

  for (const key of directKeys) {
    const value = record[key]

    if (isNonEmptyString(value)) {
      return value.trim()
    }
  }

  const issues = normalizeIssues(record.issues)
  return issues.length > 0 ? formatIssues(issues) : ""
}

export function readApiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const record = payload as Record<string, unknown>
  const issues = normalizeIssues(record.issues)
  const issueMessage = issues.length > 0 ? formatIssues(issues) : ""
  const upstreamMessage = readNestedMessage(record.upstream)

  return (
    (isNonEmptyString(record.detail) ? record.detail.trim() : "") ||
    issueMessage ||
    upstreamMessage ||
    (isNonEmptyString(record.error) ? record.error.trim() : "") ||
    fallback
  )
}

export function readApiSuccessMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const record = payload as Record<string, unknown>
  return (
    (isNonEmptyString(record.message) ? record.message.trim() : "") ||
    (isNonEmptyString(record.detail) ? record.detail.trim() : "") ||
    fallback
  )
}
