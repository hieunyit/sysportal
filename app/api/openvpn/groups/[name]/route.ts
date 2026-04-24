import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { loadOpenVpnSubjectDetail } from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  compactObject,
  formatOpenVpnZodError,
  openVpnGroupPatchSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const client = await createOpenVpnAdminClient()
    const detail = await loadOpenVpnSubjectDetail(client, "group", decodedName)

    if (!detail) {
      return apiNotFound("OpenVPN group not found", `OpenVPN group "${decodedName}" was not found.`, "openvpn")
    }

    return apiSuccess(detail)
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load OpenVPN group",
      detail: "OpenVPN group detail is unavailable",
      source: "openvpn",
    })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const body = await request.json()
    const payload = openVpnGroupPatchSchema.parse({
      ...body,
      name: decodedName,
    })
    const client = await createOpenVpnAdminClient()

    await client.setUserProps([
      compactObject(payload),
    ])

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.group.updated",
      resourceType: "openvpn-group",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Updated OpenVPN group ${decodedName}`,
    })

    return apiSuccess(
      {
        name: decodedName,
      },
      {
        message: `Updated OpenVPN group ${decodedName}.`,
      },
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
      error: "Unable to update OpenVPN group",
      detail: "OpenVPN group update failed",
      source: "openvpn",
    })
  }
}
