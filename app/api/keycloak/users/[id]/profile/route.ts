import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import {
  buildFullUserUpdateModel,
  keycloakUserPatchSchema,
  mergeUserRepresentationPayload,
} from "@/lib/keycloak-user-mutations"
import {
  mapKeycloakValidationError,
  validateKeycloakProfileInput,
} from "@/lib/keycloak-user-profile-validation"
import {
  filterHiddenUserAttributes,
  filterHiddenUserProfileMetadata,
} from "@/lib/keycloak-user-attribute-visibility"
import { formatZodError } from "@/lib/settings-validation"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient, KeycloakApiError } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

function toDisplayName(user: {
  firstName?: string
  lastName?: string
  username?: string
  email?: string
  id?: string
}) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email || user.id || "Unnamed user"
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await createKeycloakAdminClient()
    const user = await client.getUser(id)

    return NextResponse.json({
      profile: {
        username: user.username ?? "",
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        enabled: Boolean(user.enabled),
        emailVerified: Boolean(user.emailVerified),
        requiredActions: user.requiredActions ?? [],
        attributes: filterHiddenUserAttributes(user.attributes ?? {}),
      },
      profileMetadata: filterHiddenUserProfileMetadata(user.userProfileMetadata ?? null),
      updateModel: buildFullUserUpdateModel(user),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load Keycloak user profile",
        detail: getErrorDetail(error, "Keycloak user profile is unavailable"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await request.json().catch(() => null)
    const parsed = keycloakUserPatchSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid Keycloak user profile payload",
          issues: formatZodError(parsed.error),
        },
        { status: 422 },
      )
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const currentUser = await client.getUser(id)
    const nextPayload = mergeUserRepresentationPayload(currentUser, parsed.data)
    const metadataIssues = validateKeycloakProfileInput(
      nextPayload as Record<string, unknown>,
      currentUser.userProfileMetadata ?? null,
    )

    if (metadataIssues.length > 0) {
      return NextResponse.json(
        {
          error: "Keycloak user validation failed",
          detail: "The payload does not satisfy the current Keycloak user profile policy.",
          issues: metadataIssues,
        },
        { status: 422 },
      )
    }

    await client.updateUser(id, nextPayload)
    const user = await client.getUser(id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.user.profile-updated",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: toDisplayName(user),
      detail: `Updated Keycloak user profile for ${toDisplayName(user)}`,
      metadata: {
        realm: configuredRealm,
        fields: Object.keys(parsed.data),
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof KeycloakApiError && error.status === 400) {
      return NextResponse.json(mapKeycloakValidationError(error), { status: 422 })
    }

    return NextResponse.json(
      {
        error: "Unable to update Keycloak user profile",
        detail: getErrorDetail(error, "Keycloak user profile update failed"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
