import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to disconnect OpenVPN sessions",
        detail: getErrorDetail(error, "OpenVPN session disconnect failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
