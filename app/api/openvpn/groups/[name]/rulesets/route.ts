import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { getNextRulesetPosition } from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  formatOpenVpnZodError,
  openVpnRulesetCreateSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const body = await request.json()
    const payload = openVpnRulesetCreateSchema.parse(body)
    const client = await createOpenVpnAdminClient()
    const existing = (await client.listRulesets({ owner: decodedName })).rulesets ?? []
    const created = await client.addRuleset({
      name: payload.name,
      comment: payload.comment,
    })

    await client.modifySubjectRulesets({
      add: {
        [decodedName]: [
          {
            ruleset_id: created.id,
            position: payload.position ?? getNextRulesetPosition(existing),
          },
        ],
      },
    })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.group.ruleset.created",
      resourceType: "openvpn-group",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Created and assigned OpenVPN ruleset ${payload.name} to group ${decodedName}`,
      metadata: { rulesetId: created.id },
    })

    return apiSuccess(
      {
        id: created.id,
        name: payload.name,
        comment: payload.comment,
      },
      { status: 201, message: `Created OpenVPN ruleset ${payload.name}.` },
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
      error: "Unable to create OpenVPN ruleset",
      detail: "OpenVPN ruleset creation failed",
      source: "openvpn",
    })
  }
}
