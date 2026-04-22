import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { appendAuditLog, getSystemSettings } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const system = getSystemSettings()
    const items = [
      {
        id: "keycloak",
        config: system.keycloak,
        updatedAt: system.updatedAt,
      },
      {
        id: "openvpn",
        config: system.openvpn,
        updatedAt: system.updatedAt,
      },
      {
        id: "smtp",
        config: system.smtp,
        updatedAt: system.updatedAt,
      },
      {
        id: "smtp-welcome",
        config: system.smtpWelcome,
        updatedAt: system.updatedAt,
      },
    ]

    appendAuditLog({
      actorName: "Identity Admin",
      category: "access",
      action: "connection.list.viewed",
      resourceType: "connection",
      resourceId: "all",
      resourceName: "All connections",
      detail: `Viewed ${items.length} connection records`,
      metadata: { total: items.length },
    })

    return NextResponse.json({
      items,
      total: items.length,
      updatedAt: system.updatedAt,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load connections",
        detail: getErrorDetail(error, "Connection storage is unavailable"),
      },
      { status: 500 },
    )
  }
}
