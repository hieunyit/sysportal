import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { loadOpenVpnSubjectDetail } from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  compactObject,
  formatOpenVpnZodError,
  openVpnUserPatchSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const client = await createOpenVpnAdminClient()
    const detail = await loadOpenVpnSubjectDetail(client, "user", decodedName)

    if (!detail) {
      return apiNotFound("OpenVPN user not found", `OpenVPN user "${decodedName}" was not found.`, "openvpn")
    }

    return apiSuccess(detail)
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load OpenVPN user",
      detail: "OpenVPN user detail is unavailable",
      source: "openvpn",
    })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const body = await request.json()
    const payload = openVpnUserPatchSchema.parse({
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
      action: "openvpn.user.updated",
      resourceType: "openvpn-user",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Updated OpenVPN user ${decodedName}`,
    })

    return apiSuccess(
      {
        name: decodedName,
      },
      {
        message: `Updated OpenVPN user ${decodedName}.`,
      },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid OpenVPN user payload",
        issues: formatOpenVpnZodError(error),
        source: "openvpn",
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update OpenVPN user",
      detail: "OpenVPN user update failed",
      source: "openvpn",
    })
  }
}
