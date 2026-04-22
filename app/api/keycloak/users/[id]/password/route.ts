import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { keycloakPasswordResetSchema } from "@/lib/keycloak-user-mutations"
import { formatZodError } from "@/lib/settings-validation"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient, KeycloakApiError } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await request.json().catch(() => null)
    const parsed = keycloakPasswordResetSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid password reset payload",
          issues: formatZodError(parsed.error),
        },
        { status: 400 },
      )
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

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    const detail = getErrorDetail(error, "Keycloak password reset failed")
    const userStorageHint = detail.toLowerCase().includes("account is read only")
      ? " This user appears to be managed by a read-only user storage provider. Direct password reset must be done in the upstream directory or the federation provider must be writable."
      : ""

    return NextResponse.json(
      {
        error: "Unable to reset Keycloak user password",
        detail: `${detail}${userStorageHint}`,
      },
      { status: userStorageHint ? 409 : error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
