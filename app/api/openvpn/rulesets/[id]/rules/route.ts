import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { replaceRulesetRules } from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  formatOpenVpnZodError,
  openVpnRulesReplaceSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const response = await client.listRules({ rulesetIds: [parsedId] })

    return apiSuccess({
      rulesetId: parsedId,
      rules: response.rules ?? [],
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load OpenVPN rules",
      detail: "OpenVPN rules are unavailable",
      source: "openvpn",
    })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const payload = openVpnRulesReplaceSchema.parse(body)
    const client = await createOpenVpnAdminClient()
    const rules = payload.rules.map((rule) => ({
      ...rule,
      ruleset_id: parsedId,
    }))

    await replaceRulesetRules(client, parsedId, rules)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.rules.updated",
      resourceType: "openvpn-ruleset",
      resourceId: String(parsedId),
      resourceName: String(parsedId),
      detail: `Replaced OpenVPN rules for ruleset ${parsedId}`,
      metadata: { ruleCount: rules.length },
    })

    return apiSuccess(
      {
        rulesetId: parsedId,
        ruleCount: rules.length,
      },
      {
        message: `Updated OpenVPN ruleset ${parsedId} rules.`,
      },
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid OpenVPN rule payload",
        issues: formatOpenVpnZodError(error),
        source: "openvpn",
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update OpenVPN rules",
      detail: "OpenVPN rules update failed",
      source: "openvpn",
    })
  }
}
