import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const user = await client.getUser(id)

    await client.logoutUser(id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "action",
      action: "keycloak.user.logged-out",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: user.username ?? user.email ?? id,
      detail: `Terminated all sessions for Keycloak user ${user.username ?? id}`,
      metadata: {
        realm: configuredRealm,
      },
    })

    return apiSuccess(
      {
        success: true,
        id,
      },
      {
        message: `Logged out Keycloak user ${user.username ?? id}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to log out Keycloak user sessions",
      detail: "Keycloak logout failed",
      source: "keycloak",
    })
  }
}
