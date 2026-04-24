import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const { id, userId } = await params
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const [group, user] = await Promise.all([client.getGroup(id), client.getUser(userId)])

    await client.removeUserFromGroup(userId, id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.group.member-removed",
      resourceType: "keycloak-group",
      resourceId: group.id ?? id,
      resourceName: group.path ?? group.name ?? id,
      detail: `Removed ${user.username ?? userId} from Keycloak group ${group.path ?? group.name ?? id}`,
      metadata: {
        realm: configuredRealm,
        userId,
      },
    })

    return apiSuccess(
      {
        userId,
      },
      {
        message: `Removed ${user.username ?? userId} from Keycloak group ${group.path ?? group.name ?? id}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to remove member from Keycloak group",
      detail: "Keycloak group membership removal failed",
      source: "keycloak",
    })
  }
}
