import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim().toLowerCase() ?? ""
    const client = await createKeycloakAdminClient()
    const allGroups = await client.listAllGroups()

    const items = (search
      ? allGroups.filter((group) =>
          [group.name, group.path, group.description ?? ""].join(" ").toLowerCase().includes(search),
        )
      : allGroups
    )
      .slice(0, 20)
      .map((group) => ({
        id: group.id,
        name: group.name,
        path: group.path,
        description: group.description ?? null,
      }))

    return apiSuccess({
      items,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to search Keycloak groups",
      detail: "Keycloak group lookup is unavailable",
      source: "keycloak",
    })
  }
}
