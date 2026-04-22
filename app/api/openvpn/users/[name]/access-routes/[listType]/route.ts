import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import {
  createOpenVpnAdminClient,
  OpenVpnApiError,
} from "@/lib/openvpn-admin"
import {
  buildAccessListItems,
  loadOpenVpnSubjectDetail,
} from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  formatOpenVpnZodError,
  openVpnAccessListReplaceSchema,
  openVpnAccessListTypeSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ name: string; listType: string }> }) {
  try {
    const { name, listType } = await params
    const decodedName = decodeURIComponent(name)
    const parsedListType = openVpnAccessListTypeSchema.parse(listType)
    const client = await createOpenVpnAdminClient()
    const detail = await loadOpenVpnSubjectDetail(client, "user", decodedName)

    if (!detail) {
      return NextResponse.json({ error: "OpenVPN user not found" }, { status: 404 })
    }

    return NextResponse.json({
      name: decodedName,
      listType: parsedListType,
      routes: detail.accessLists[parsedListType],
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN access list type",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to load OpenVPN access routes",
        detail: getErrorDetail(error, "OpenVPN access list is unavailable"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ name: string; listType: string }> }) {
  try {
    const { name, listType } = await params
    const decodedName = decodeURIComponent(name)
    const parsedListType = openVpnAccessListTypeSchema.parse(listType)
    const body = await request.json()
    const payload = openVpnAccessListReplaceSchema.parse(body)
    const client = await createOpenVpnAdminClient()

    await client.setAccessLists({
      items_set: buildAccessListItems("user", decodedName, parsedListType, payload.routes),
    })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.user.access.updated",
      resourceType: "openvpn-user",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Updated ${parsedListType} access routes for OpenVPN user ${decodedName}`,
      metadata: { routeCount: payload.routes.length },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN access route payload",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update OpenVPN access routes",
        detail: getErrorDetail(error, "OpenVPN access route update failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
