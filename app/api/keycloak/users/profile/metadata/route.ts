import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { filterHiddenUserProfileMetadata } from "@/lib/keycloak-user-attribute-visibility"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"
import { getSystemConnection } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const profileMetadata = await client.getUserProfileMetadata()

    return apiSuccess({
      realm: configuredRealm,
      profileMetadata: filterHiddenUserProfileMetadata(profileMetadata),
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load Keycloak user profile metadata",
      detail: "Keycloak user profile metadata is unavailable",
      source: "keycloak",
    })
  }
}
