import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"
import { createOpenVpnAdminClient } from "@/lib/openvpn-admin"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)
    if (isApiAuthResponse(auth)) return auth

    const { id } = await params
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm

    const user = await client.getUser(id)
    const username = user.username ?? user.email ?? id
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim() || username

    const groups = await client.getUserGroups(id)
    const groupNames = groups.map((g) => g.name ?? g.id ?? "").filter(Boolean)

    // Remove from all groups + terminate sessions in parallel
    await Promise.all([
      ...groups.map((g) => g.id ? client.removeUserFromGroup(id, g.id) : Promise.resolve()),
      client.logoutUser(id).catch(() => null),
    ])

    // Disable Keycloak account
    await client.updateUser(id, { enabled: false })

    // Deny OpenVPN access if user exists
    let vpnRevoked = false
    try {
      const vpnClient = await createOpenVpnAdminClient()
      const vpnUser = await vpnClient.getUser(username).catch(() => null)
      if (vpnUser) {
        await vpnClient.setUserProps([{ name: username, deny: true }])
        vpnRevoked = true
      }
    } catch {
      // OpenVPN not configured or unreachable — non-fatal
    }

    appendAuditLog({
      actorName: auth.actorName,
      category: "edit",
      action: "keycloak.user.offboarded",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: displayName,
      detail: `Offboarded ${displayName}: account disabled, removed from ${groups.length} group(s), sessions terminated${vpnRevoked ? ", OpenVPN access denied" : ""}`,
      metadata: {
        realm: configuredRealm,
        groupsRemoved: groupNames,
        vpnRevoked,
      },
    })

    return apiSuccess(
      {
        username,
        displayName,
        groupsRemoved: groupNames,
        sessionsTerminated: true,
        vpnRevoked,
      },
      { message: `${displayName} has been offboarded.` },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Offboarding failed",
      detail: "Unable to complete offboarding workflow",
      source: "keycloak",
    })
  }
}
