import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = (await request.json().catch(() => null)) as { userId?: unknown } | null
    const userId = typeof payload?.userId === "string" ? payload.userId.trim() : ""

    if (!userId) {
      return apiValidationError({
        error: "Invalid group member payload",
        issues: [{ path: "userId", message: "User ID is required" }],
        source: "keycloak",
      })
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const [group, user] = await Promise.all([client.getGroup(id), client.getUser(userId)])

    await client.addUserToGroup(userId, id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.group.member-added",
      resourceType: "keycloak-group",
      resourceId: group.id ?? id,
      resourceName: group.path ?? group.name ?? id,
      detail: `Added ${user.username ?? userId} to Keycloak group ${group.path ?? group.name ?? id}`,
      metadata: {
        realm: configuredRealm,
        userId,
      },
    })

    return apiSuccess(
      {
        success: true,
        userId,
      },
      {
        status: 201,
        message: `Added ${user.username ?? userId} to Keycloak group ${group.path ?? group.name ?? id}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to add member to Keycloak group",
      detail: "Keycloak group membership update failed",
      source: "keycloak",
    })
  }
}
