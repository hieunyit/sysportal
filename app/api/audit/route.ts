import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { getAuditLogSummary, listAuditLogs } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get("limit") ?? "24")
    const resourceType = searchParams.get("resourceType") ?? undefined
    const resourceId = searchParams.get("resourceId") ?? undefined
    const category = searchParams.get("category") ?? undefined
    const action = searchParams.get("action") ?? undefined
    const search = searchParams.get("search") ?? undefined

    return NextResponse.json({
      summary: getAuditLogSummary({
        resourceType,
        resourceId,
        category: category as "access" | "edit" | "action" | undefined,
        action,
        search,
      }),
      items: listAuditLogs({
        limit: Number.isFinite(limit) ? limit : 24,
        resourceType,
        resourceId,
        category: category as "access" | "edit" | "action" | undefined,
        action,
        search,
      }),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load audit logs",
        detail: getErrorDetail(error, "Audit storage is unavailable"),
      },
      { status: 500 },
    )
  }
}
