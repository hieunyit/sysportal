import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { getAuditLogSummary, listAuditLogs } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") ?? "24")
    const resourceType = searchParams.get("resourceType") ?? undefined
    const resourceId = searchParams.get("resourceId") ?? undefined
    const action = searchParams.get("action") ?? undefined
    const search = searchParams.get("search") ?? undefined

    return apiSuccess({
      summary: getAuditLogSummary({
        resourceType,
        resourceId,
        category: "edit",
        action,
        search,
      }),
      items: listAuditLogs({
        limit: Number.isFinite(limit) ? limit : 24,
        resourceType,
        resourceId,
        category: "edit",
        action,
        search,
      }),
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load audit logs",
      detail: "Audit storage is unavailable",
    })
  }
}
