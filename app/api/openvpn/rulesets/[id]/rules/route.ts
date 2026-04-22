import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
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
      return NextResponse.json({ error: "Invalid ruleset id" }, { status: 422 })
    }

    const client = await createOpenVpnAdminClient()
    const response = await client.listRules({ rulesetIds: [parsedId] })

    return NextResponse.json({
      rulesetId: parsedId,
      rules: response.rules ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load OpenVPN rules",
        detail: getErrorDetail(error, "OpenVPN rules are unavailable"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsedId = Number(id)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ error: "Invalid ruleset id" }, { status: 422 })
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN rule payload",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update OpenVPN rules",
        detail: getErrorDetail(error, "OpenVPN rules update failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
