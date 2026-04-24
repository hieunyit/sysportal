import { NextResponse } from "next/server"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { appendAuditLog } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ name: string; rulesetId: string }> },
) {
  try {
    const { name, rulesetId } = await params
    const decodedName = decodeURIComponent(name)
    const parsedRulesetId = Number(rulesetId)

    if (!Number.isInteger(parsedRulesetId) || parsedRulesetId <= 0) {
      return apiValidationError({
        error: "Invalid ruleset id",
        detail: "Ruleset id must be a positive integer.",
        issues: [{ path: "rulesetId", message: "Ruleset id must be a positive integer." }],
        source: "openvpn",
      })
    }

    const client = await createOpenVpnAdminClient()
    await client.modifySubjectRulesets({
      delete: {
        [decodedName]: {
          ruleset_ids: [parsedRulesetId],
        },
      },
    })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.group.ruleset.unassigned",
      resourceType: "openvpn-group",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Unassigned OpenVPN ruleset ${parsedRulesetId} from group ${decodedName}`,
    })

    return apiSuccess(
      {
        rulesetId: parsedRulesetId,
        owner: decodedName,
      },
      {
        message: `Unassigned OpenVPN ruleset ${parsedRulesetId} from ${decodedName}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to unassign OpenVPN ruleset",
      detail: "OpenVPN ruleset assignment update failed",
      source: "openvpn",
    })
  }
}
