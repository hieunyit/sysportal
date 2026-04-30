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
    const offset = Number(searchParams.get("offset") ?? "0")
    const resourceType = searchParams.get("resourceType") ?? undefined
    const resourceId = searchParams.get("resourceId") ?? undefined
    const action = searchParams.get("action") ?? undefined
    const search = searchParams.get("search") ?? undefined

    const filterOptions = {
      resourceType,
      resourceId,
      category: "edit" as const,
      action,
      search,
    }

    return apiSuccess({
      summary: getAuditLogSummary(filterOptions),
      items: listAuditLogs({
        ...filterOptions,
        limit: Number.isFinite(limit) && limit > 0 ? limit : 24,
        offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
      }),
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load audit logs",
      detail: "Audit storage is unavailable",
    })
  }
}
