import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { createKeycloakAdminClient, KeycloakApiError } from "@/lib/keycloak-admin"

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

    return NextResponse.json({
      items,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to search Keycloak groups",
        detail: getErrorDetail(error, "Keycloak group lookup is unavailable"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
