export function getErrorDetail(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "detail" in error &&
    typeof (error as { detail?: unknown }).detail === "string" &&
    (error as { detail: string }).detail.trim()
  ) {
    return (error as { detail: string }).detail
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}
