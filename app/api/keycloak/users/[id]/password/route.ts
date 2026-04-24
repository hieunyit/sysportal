import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { keycloakPasswordResetSchema } from "@/lib/keycloak-user-mutations"
import { formatZodError } from "@/lib/settings-validation"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await request.json().catch(() => null)
    const parsed = keycloakPasswordResetSchema.safeParse(payload)

    if (!parsed.success) {
      return apiValidationError({
        error: "Invalid password reset payload",
        issues: formatZodError(parsed.error),
        source: "keycloak",
        status: 400,
      })
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const user = await client.getUser(id)

    await client.resetUserPassword(id, parsed.data)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "action",
      action: "keycloak.user.password-reset",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: user.username ?? user.email ?? id,
      detail: `Reset password for Keycloak user ${user.username ?? id}`,
      metadata: {
        realm: configuredRealm,
        temporary: parsed.data.temporary,
      },
    })

    return apiSuccess(
      {
        success: true,
        id,
      },
      {
        message: `Reset password for Keycloak user ${user.username ?? id}.`,
      },
    )
  } catch (error) {
    const detail =
      error instanceof Error && error.message.trim()
        ? error.message
        : "Keycloak password reset failed"
    const userStorageHint = detail.toLowerCase().includes("account is read only")
      ? " This user appears to be managed by a read-only user storage provider. Direct password reset must be done in the upstream directory or the federation provider must be writable."
      : ""

    return apiErrorResponse(error, {
      error: "Unable to reset Keycloak user password",
      detail: `${detail}${userStorageHint}`,
      source: "keycloak",
      status: userStorageHint ? 409 : undefined,
    })
  }
}
