import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { filterHiddenUserProfileMetadata } from "@/lib/keycloak-user-attribute-visibility"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"
import { getSystemConnection } from "@/lib/settings-store"

export const runtime = "nodejs"
const PROFILE_METADATA_CACHE_TTL_MS = 60_000

declare global {
  var __identityOpsKeycloakProfileMetadataCache__:
    | {
        realm: string
        profileMetadata: unknown
        expiresAt: number
      }
    | undefined
}

export async function GET() {
  try {
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const cached = globalThis.__identityOpsKeycloakProfileMetadataCache__

    if (cached && cached.realm === configuredRealm && cached.expiresAt > Date.now()) {
      return apiSuccess({
        realm: cached.realm,
        profileMetadata: cached.profileMetadata,
      })
    }

    const client = await createKeycloakAdminClient()
    const profileMetadata = filterHiddenUserProfileMetadata(await client.getUserProfileMetadata())

    globalThis.__identityOpsKeycloakProfileMetadataCache__ = {
      realm: configuredRealm,
      profileMetadata,
      expiresAt: Date.now() + PROFILE_METADATA_CACHE_TTL_MS,
    }

    return apiSuccess({
      realm: configuredRealm,
      profileMetadata,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load Keycloak user profile metadata",
      detail: "Keycloak user profile metadata is unavailable",
      source: "keycloak",
    })
  }
}
