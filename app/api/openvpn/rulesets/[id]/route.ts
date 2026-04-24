import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { appendAuditLog } from "@/lib/settings-store"
import {
  formatOpenVpnZodError,
  openVpnRulesetUpdateSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsedId = Number(id)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return apiValidationError({
        error: "Invalid ruleset id",
        detail: "Ruleset id must be a positive integer.",
        issues: [{ path: "id", message: "Ruleset id must be a positive integer." }],
        source: "openvpn",
      })
    }

    const body = await request.json()
    const payload = openVpnRulesetUpdateSchema.parse(body)
    const client = await createOpenVpnAdminClient()

    await client.updateRuleset({
      id: parsedId,
      name: payload.name,
      comment: payload.comment,
    })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.ruleset.updated",
      resourceType: "openvpn-ruleset",
      resourceId: String(parsedId),
      resourceName: payload.name,
      detail: `Updated OpenVPN ruleset ${payload.name}`,
    })

    return apiSuccess(
      {
        id: parsedId,
      },
      {
        message: `Updated OpenVPN ruleset ${payload.name}.`,
      },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid OpenVPN ruleset payload",
        issues: formatOpenVpnZodError(error),
        source: "openvpn",
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update OpenVPN ruleset",
      detail: "OpenVPN ruleset update failed",
      source: "openvpn",
    })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsedId = Number(id)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return apiValidationError({
        error: "Invalid ruleset id",
        detail: "Ruleset id must be a positive integer.",
        issues: [{ path: "id", message: "Ruleset id must be a positive integer." }],
        source: "openvpn",
      })
    }

    const client = await createOpenVpnAdminClient()
    await client.deleteRulesets([parsedId])

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.ruleset.deleted",
      resourceType: "openvpn-ruleset",
      resourceId: String(parsedId),
      resourceName: String(parsedId),
      detail: `Deleted OpenVPN ruleset ${parsedId}`,
    })

    return apiSuccess(
      {
        id: parsedId,
      },
      {
        message: `Deleted OpenVPN ruleset ${parsedId}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to delete OpenVPN ruleset",
      detail: "OpenVPN ruleset delete failed",
      source: "openvpn",
    })
  }
}
