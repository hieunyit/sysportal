import { NextResponse } from "next/server"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { appendAuditLog } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const body = (await request.json().catch(() => ({}))) as {
      reason?: string
      clientReason?: string
    }
    const client = await createOpenVpnAdminClient()

    await client.disconnectVpnClients({
      users: [decodedName],
      reason: body.reason?.trim() || `Disconnected OpenVPN sessions for ${decodedName}`,
      client_reason: body.clientReason?.trim() || "Disconnected by an administrator",
    })

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.user.sessions.disconnected",
      resourceType: "openvpn-user",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Disconnected OpenVPN sessions for ${decodedName}`,
    })

    return apiSuccess(
      {
        name: decodedName,
      },
      {
        message: `Disconnected OpenVPN sessions for ${decodedName}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to disconnect OpenVPN sessions",
      detail: "OpenVPN session disconnect failed",
      source: "openvpn",
    })
  }
}
