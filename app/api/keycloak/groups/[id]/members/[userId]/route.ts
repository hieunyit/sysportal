import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient, KeycloakApiError } from "@/lib/keycloak-admin"

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

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to remove member from Keycloak group",
        detail: getErrorDetail(error, "Keycloak group membership removal failed"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
