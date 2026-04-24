import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = (await request.json().catch(() => null)) as { groupId?: unknown } | null
    const groupId = typeof payload?.groupId === "string" ? payload.groupId.trim() : ""

    if (!groupId) {
      return apiValidationError({
        error: "Invalid group assignment payload",
        issues: [{ path: "groupId", message: "Group ID is required" }],
        source: "keycloak",
      })
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const [user, group] = await Promise.all([client.getUser(id), client.getGroup(groupId)])

    await client.addUserToGroup(id, groupId)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.user.group-added",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: user.username ?? user.email ?? id,
      detail: `Added ${user.username ?? id} to Keycloak group ${group.path ?? group.name ?? groupId}`,
      metadata: {
        realm: configuredRealm,
        groupId,
      },
    })

    return apiSuccess(
      {
        success: true,
        groupId,
      },
      {
        status: 201,
        message: `Added ${user.username ?? id} to Keycloak group ${group.path ?? group.name ?? groupId}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to add Keycloak user to group",
      detail: "Keycloak group assignment failed",
      source: "keycloak",
    })
  }
}
