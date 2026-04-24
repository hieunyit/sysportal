import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const user = await client.getUser(id)

    await client.clearUserLoginFailures(id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "action",
      action: "keycloak.user.login-failures-cleared",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: user.username ?? user.email ?? id,
      detail: `Cleared brute-force login failures for Keycloak user ${user.username ?? id}`,
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
        message: `Cleared Keycloak brute-force lock state for ${user.username ?? id}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to clear Keycloak login failures",
      detail: "Keycloak brute-force unlock failed",
      source: "keycloak",
    })
  }
}
