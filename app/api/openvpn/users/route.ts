import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import {
  createOpenVpnAdminClient,
  OpenVpnApiError,
} from "@/lib/openvpn-admin"
import { appendAuditLog } from "@/lib/settings-store"
import {
  formatOpenVpnZodError,
  openVpnUserCreateSchema,
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
    const profiles = await client.listAllUsers({
      search: search || undefined,
    })

    const start = (page - 1) * pageSize
    const items = profiles.slice(start, start + pageSize).map((profile) => ({
      name: profile.name,
      group: profile.group ?? null,
      authMethod: getStringPropValue(profile.auth_method),
      admin: getBooleanPropValue(profile.admin) ?? false,
      autologin: getBooleanPropValue(profile.autologin) ?? false,
      denied: getBooleanPropValue(profile.deny) ?? false,
      denyWeb: getBooleanPropValue(profile.deny_web) ?? false,
      mfaStatus: profile.mfa_status ?? null,
      passwordDefined: profile.password_defined ?? false,
      staticIpv4: profile.static_ipv4 ?? null,
      staticIpv6: profile.static_ipv6 ?? null,
    }))

    appendAuditLog({
      actorName: "Identity Admin",
      category: "access",
      action: "openvpn.users.viewed",
      resourceType: "openvpn-user",
      resourceId: "all",
      resourceName: "All OpenVPN users",
      detail: `Viewed OpenVPN users (${profiles.length} matched)`,
      metadata: { page, pageSize, search, total: profiles.length },
    })

    return NextResponse.json({
      summary: {
        totalUsers: profiles.length,
        adminUsers: profiles.filter((profile) => getBooleanPropValue(profile.admin)).length,
        deniedUsers: profiles.filter((profile) => getBooleanPropValue(profile.deny)).length,
        autologinUsers: profiles.filter((profile) => getBooleanPropValue(profile.autologin)).length,
      },
      items,
      total: profiles.length,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(profiles.length / pageSize), 1),
      search,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load OpenVPN users",
        detail: getErrorDetail(error, "OpenVPN user inventory is unavailable"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = openVpnUserCreateSchema.parse(body)
    const client = await createOpenVpnAdminClient()

    await client.createUser(payload)
    const created = await client.getUser(payload.name)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.user.created",
      resourceType: "openvpn-user",
      resourceId: payload.name,
      resourceName: payload.name,
      detail: `Created OpenVPN user ${payload.name}`,
      metadata: { group: payload.group ?? null },
    })

    return NextResponse.json(
      {
        name: payload.name,
        profile: created,
      },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN user payload",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to create OpenVPN user",
        detail: getErrorDetail(error, "OpenVPN user creation failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
