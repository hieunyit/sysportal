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
    const result = await client.resetUserOtp(id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "action",
      action: "keycloak.user.otp-reset",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: user.username ?? user.email ?? id,
      detail: `Reset OTP credentials for Keycloak user ${user.username ?? id}`,
      metadata: {
        realm: configuredRealm,
        removedCount: result.removedCount,
      },
    })

    return apiSuccess(
      {
        success: true,
        removedCount: result.removedCount,
      },
      {
        message: `Reset Keycloak OTP credentials for ${user.username ?? id}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to reset Keycloak user OTP",
      detail: "Keycloak OTP reset failed",
      source: "keycloak",
    })
  }
}
