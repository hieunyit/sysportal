import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import {
  createOpenVpnAdminClient,
  OpenVpnApiError,
} from "@/lib/openvpn-admin"
import { appendAuditLog } from "@/lib/settings-store"
import {
  formatOpenVpnZodError,
  openVpnGroupCreateSchema,
} from "@/lib/openvpn-mutations"
import {
  getBooleanPropValue,
  getStringPropValue,
} from "@/lib/openvpn-directory"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1)
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "12"), 1), 50)
    const search = searchParams.get("search")?.trim() ?? ""
    const client = await createOpenVpnAdminClient()
    const profiles = await client.listAllGroups({
      search: search || undefined,
      enumerateMembers: false,
    })

    const start = (page - 1) * pageSize
    const items = profiles.slice(start, start + pageSize).map((profile) => ({
      name: profile.name,
      authMethod: getStringPropValue(profile.auth_method),
      admin: getBooleanPropValue(profile.admin) ?? false,
      autologin: getBooleanPropValue(profile.autologin) ?? false,
      denied: getBooleanPropValue(profile.deny) ?? false,
      denyWeb: getBooleanPropValue(profile.deny_web) ?? false,
      memberCount: profile.member_count ?? 0,
      subnetCount: profile.subnets?.length ?? 0,
      dynamicRangeCount: profile.dynamic_ranges?.length ?? 0,
    }))

    return apiSuccess({
      summary: {
        totalGroups: profiles.length,
        adminGroups: profiles.filter((profile) => getBooleanPropValue(profile.admin)).length,
        deniedGroups: profiles.filter((profile) => getBooleanPropValue(profile.deny)).length,
        groupsWithMembers: profiles.filter((profile) => (profile.member_count ?? 0) > 0).length,
      },
      items,
      total: profiles.length,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(profiles.length / pageSize), 1),
      search,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load OpenVPN groups",
      detail: "OpenVPN group inventory is unavailable",
      source: "openvpn",
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = openVpnGroupCreateSchema.parse(body)
    const client = await createOpenVpnAdminClient()

    await client.createGroup(payload)
    const created = await client.getGroup(payload.name, { enumerateMembers: true })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.group.created",
      resourceType: "openvpn-group",
      resourceId: payload.name,
      resourceName: payload.name,
      detail: `Created OpenVPN group ${payload.name}`,
    })

    return apiSuccess(
      {
        name: payload.name,
        profile: created,
      },
      { status: 201, message: `Created OpenVPN group ${payload.name}.` },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid OpenVPN group payload",
        issues: formatOpenVpnZodError(error),
        source: "openvpn",
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to create OpenVPN group",
      detail: "OpenVPN group creation failed",
      source: "openvpn",
    })
  }
}
