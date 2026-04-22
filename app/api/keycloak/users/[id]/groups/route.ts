import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient, KeycloakApiError } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = (await request.json().catch(() => null)) as { groupId?: unknown } | null
    const groupId = typeof payload?.groupId === "string" ? payload.groupId.trim() : ""

    if (!groupId) {
      return NextResponse.json(
        {
          error: "Invalid group assignment payload",
          issues: [
            {
              path: "groupId",
              message: "Group ID is required",
            },
          ],
        },
        { status: 422 },
      )
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

    return NextResponse.json(
      {
        success: true,
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to add Keycloak user to group",
        detail: getErrorDetail(error, "Keycloak group assignment failed"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
