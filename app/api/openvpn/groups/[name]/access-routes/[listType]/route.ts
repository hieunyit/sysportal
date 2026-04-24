import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
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
    const detail = await loadOpenVpnSubjectDetail(client, "group", decodedName)

    if (!detail) {
      return apiNotFound("OpenVPN group not found", `OpenVPN group "${decodedName}" was not found.`, "openvpn")
    }

    return apiSuccess({
      name: decodedName,
      listType: parsedListType,
      routes: detail.accessLists[parsedListType],
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid OpenVPN access list type",
        issues: formatOpenVpnZodError(error),
        source: "openvpn",
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to load OpenVPN access routes",
      detail: "OpenVPN access list is unavailable",
      source: "openvpn",
    })
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
      items_set: buildAccessListItems("group", decodedName, parsedListType, payload.routes),
    })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.group.access.updated",
      resourceType: "openvpn-group",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Updated ${parsedListType} access routes for OpenVPN group ${decodedName}`,
      metadata: { routeCount: payload.routes.length },
    })

    return apiSuccess(
      {
        name: decodedName,
        listType: parsedListType,
        routeCount: payload.routes.length,
      },
      {
        message: `Updated ${parsedListType} access routes for ${decodedName}.`,
      },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid OpenVPN access route payload",
        issues: formatOpenVpnZodError(error),
        source: "openvpn",
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update OpenVPN access routes",
      detail: "OpenVPN access route update failed",
      source: "openvpn",
    })
  }
}
