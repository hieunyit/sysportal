import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> },
) {
  try {
    const { id, groupId } = await params
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const [user, group] = await Promise.all([client.getUser(id), client.getGroup(groupId)])

    await client.removeUserFromGroup(id, groupId)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.user.group-removed",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: user.username ?? user.email ?? id,
      detail: `Removed ${user.username ?? id} from Keycloak group ${group.path ?? group.name ?? groupId}`,
      metadata: {
        realm: configuredRealm,
        groupId,
      },
    })

    return apiSuccess(
      {
        groupId,
      },
      {
        message: `Removed ${user.username ?? id} from Keycloak group ${group.path ?? group.name ?? groupId}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to remove Keycloak user from group",
      detail: "Keycloak group removal failed",
      source: "keycloak",
    })
  }
}
