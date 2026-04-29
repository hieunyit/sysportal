import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await createKeycloakAdminClient()
    const user = await client.getUser(id)

    await client.logoutUser(id)

    return apiSuccess(
      { success: true, id },
      { message: `Logged out Keycloak user ${user.username ?? id}.` },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to log out Keycloak user sessions",
      detail: "Keycloak logout failed",
      source: "keycloak",
    })
  }
}
