import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
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
      return NextResponse.json({ error: "Invalid ruleset id" }, { status: 422 })
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN ruleset payload",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update OpenVPN ruleset",
        detail: getErrorDetail(error, "OpenVPN ruleset update failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const parsedId = Number(id)

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return NextResponse.json({ error: "Invalid ruleset id" }, { status: 422 })
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to delete OpenVPN ruleset",
        detail: getErrorDetail(error, "OpenVPN ruleset delete failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
