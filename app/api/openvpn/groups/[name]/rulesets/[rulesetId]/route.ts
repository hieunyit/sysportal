import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
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
      return NextResponse.json({ error: "Invalid ruleset id" }, { status: 422 })
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to unassign OpenVPN ruleset",
        detail: getErrorDetail(error, "OpenVPN ruleset assignment update failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
