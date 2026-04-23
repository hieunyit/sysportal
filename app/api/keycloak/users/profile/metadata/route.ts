import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { filterHiddenUserProfileMetadata } from "@/lib/keycloak-user-attribute-visibility"
import { createKeycloakAdminClient, KeycloakApiError } from "@/lib/keycloak-admin"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const profileMetadata = await client.getUserProfileMetadata()

    return NextResponse.json({
      realm: configuredRealm,
      profileMetadata: filterHiddenUserProfileMetadata(profileMetadata),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load Keycloak user profile metadata",
        detail: getErrorDetail(error, "Keycloak user profile metadata is unavailable"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
