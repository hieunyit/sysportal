import { NextResponse } from "next/server"
import {
  apiErrorResponse,
  apiProblemResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response"
import {
  appendAuditLog,
  getSystemConnection,
} from "@/lib/settings-store"
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
import {
  createKeycloakAdminClient,
  epochToIso,
  getPasswordCredential,
  KeycloakApiError,
  type KeycloakAdminEventRepresentation,
  type KeycloakEventRepresentation,
  type KeycloakGroupRepresentation,
} from "@/lib/keycloak-admin"

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

function mapGroupSummary(group: KeycloakGroupRepresentation) {
  return {
    id: group.id ?? "",
    name: group.name ?? "",
    path: group.path ?? "",
  }
}

function normalizeRealmEvent(event: KeycloakEventRepresentation) {
  return {
    id: event.id ?? crypto.randomUUID(),
    source: "realm-event" as const,
    occurredAt: epochToIso(event.time) ?? null,
    epoch: event.time ?? 0,
    label: event.type ?? "UNKNOWN",
    clientId: event.clientId ?? null,
    ipAddress: event.ipAddress ?? null,
    sessionId: event.sessionId ?? null,
    error: event.error ?? null,
    details: event.details ?? {},
  }
}

function normalizeAdminEvent(event: KeycloakAdminEventRepresentation) {
  return {
    id: event.id ?? crypto.randomUUID(),
    source: "admin-event" as const,
    occurredAt: epochToIso(event.time) ?? null,
    epoch: event.time ?? 0,
    label: `${event.operationType ?? "UNKNOWN"} ${event.resourceType ?? ""}`.trim(),
    clientId: event.authDetails?.clientId ?? null,
    ipAddress: event.authDetails?.ipAddress ?? null,
    sessionId: null,
    error: event.error ?? null,
    resourcePath: event.resourcePath ?? null,
    actorUserId: event.authDetails?.userId ?? null,
    actorUsername: event.authDetails?.username ?? null,
    details: event.details ?? {},
  }
}

async function safeSection<T>(action: () => Promise<T>, message: string) {
  try {
    return {
      data: await action(),
      warning: null,
    }
  } catch (error) {
    return {
      data: null as T | null,
      warning: error instanceof Error ? `${message}: ${error.message}` : message,
    }
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm

    const [realm, eventConfig, user, credentials, groups, roleMappings, federatedIdentities, sessions] =
      await Promise.all([
        client.getRealm(),
        safeSection(() => client.getEventsConfig(), "Realm event configuration is unavailable"),
        client.getUser(id),
        client.getUserCredentials(id),
        client.getUserGroups(id),
        client.getUserRoleMappings(id),
        safeSection(() => client.getUserFederatedIdentities(id), "Federated identities are unavailable"),
        safeSection(() => client.getUserSessions(id), "Active session data is unavailable"),
      ])

    const [bruteForceStatus, realmEvents, adminEvents] = await Promise.all([
      safeSection(() => client.getBruteForceStatus(id), "Brute-force status is unavailable"),
      safeSection(
        () =>
          client.getRealmEvents({
            user: id,
            max: 100,
            direction: "desc",
          }),
        "Realm events are unavailable",
      ),
      safeSection(
        () =>
          client.getAdminEvents({
            resourceTypes: ["USER"],
            max: 200,
            direction: "desc",
          }),
        "Admin events are unavailable",
      ),
    ])

    const filteredAdminEvents = (adminEvents.data ?? []).filter((event) =>
      (event.resourcePath ?? "").startsWith(`users/${id}`),
    )
    const passwordCredential = getPasswordCredential(credentials)
    const normalizedRealmEvents = (realmEvents.data ?? []).map(normalizeRealmEvent)
    const normalizedAdminEvents = filteredAdminEvents.map(normalizeAdminEvent)
    const activity = [...normalizedRealmEvents, ...normalizedAdminEvents].sort((left, right) => right.epoch - left.epoch)

    const latestSuccessfulLogin = normalizedRealmEvents.find((event) => event.label === "LOGIN" && !event.error) ?? null
    const latestPasswordAdminEvent =
      normalizedAdminEvents.find((event) => (event.resourcePath ?? "").includes("/reset-password")) ?? null
    const warnings = [
      eventConfig.warning,
      federatedIdentities.warning,
      sessions.warning,
      bruteForceStatus.warning,
      realmEvents.warning,
      adminEvents.warning,
    ].filter(Boolean)

    return apiSuccess({
      summary: {
        realm: realm.realm ?? configuredRealm,
        displayName: realm.displayName ?? null,
        eventsEnabled: Boolean(eventConfig.data?.eventsEnabled),
        adminEventsEnabled: Boolean(eventConfig.data?.adminEventsEnabled),
        adminEventsDetailsEnabled: Boolean(eventConfig.data?.adminEventsDetailsEnabled),
        latestSuccessfulLoginAt: latestSuccessfulLogin?.occurredAt ?? null,
        passwordLastSetAt:
          epochToIso(passwordCredential?.createdDate) ??
          latestPasswordAdminEvent?.occurredAt ??
          null,
      },
      user: {
        id: user.id ?? id,
        username: user.username ?? "",
        displayName: toDisplayName(user),
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        email: user.email ?? "",
        enabled: Boolean(user.enabled),
        emailVerified: Boolean(user.emailVerified),
        createdAt: epochToIso(user.createdTimestamp) ?? null,
        federationLink: user.federationLink ?? null,
        requiredActions: user.requiredActions ?? [],
        disableableCredentialTypes: user.disableableCredentialTypes ?? [],
        notBefore: user.notBefore ?? null,
        attributes: filterHiddenUserAttributes(user.attributes ?? {}),
        access: user.access ?? {},
        userProfileMetadata: filterHiddenUserProfileMetadata(user.userProfileMetadata ?? null),
      },
      updateModel: buildFullUserUpdateModel(user),
      security: {
        passwordCredentialId: passwordCredential?.id ?? null,
        passwordLastSetAt: epochToIso(passwordCredential?.createdDate) ?? null,
        passwordTemporary: Boolean(passwordCredential?.temporary),
        bruteForceStatus: bruteForceStatus.data ?? null,
      },
      credentials: credentials.map((credential) => ({
        id: credential.id ?? "",
        type: credential.type ?? "",
        userLabel: credential.userLabel ?? null,
        createdAt: epochToIso(credential.createdDate) ?? null,
        priority: credential.priority ?? null,
        temporary: Boolean(credential.temporary),
        device: credential.device ?? null,
        credentialData: credential.credentialData ?? null,
      })),
      groups: groups.map(mapGroupSummary),
      roleMappings: roleMappings,
      federatedIdentities: federatedIdentities.data ?? [],
      sessions:
        (sessions.data ?? []).map((session) => ({
          id: session.id ?? "",
          username: session.username ?? "",
          ipAddress: session.ipAddress ?? null,
          startAt: epochToIso(session.start) ?? null,
          lastAccessAt: epochToIso(session.lastAccess) ?? null,
          rememberMe: Boolean(session.rememberMe),
          clients: session.clients ?? {},
          transientUser: Boolean(session.transientUser),
        })),
      realmEvents: normalizedRealmEvents,
      adminEvents: normalizedAdminEvents,
      activity,
      warnings,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load Keycloak user detail",
      detail: "Keycloak user detail is unavailable",
      source: "keycloak",
    })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = await request.json().catch(() => null)
    const parsed = keycloakUserPatchSchema.safeParse(payload)

    if (!parsed.success) {
      return apiValidationError({
        error: "Invalid Keycloak user update payload",
        issues: formatZodError(parsed.error),
        source: "keycloak",
      })
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
      return apiValidationError({
        error: "Keycloak user validation failed",
        detail: "The payload does not satisfy the current Keycloak user profile policy.",
        issues: metadataIssues,
        source: "keycloak",
      })
    }

    await client.updateUser(id, nextPayload)
    const user = await client.getUser(id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.user.updated",
      resourceType: "keycloak-user",
      resourceId: user.id ?? id,
      resourceName: toDisplayName(user),
      detail: `Updated Keycloak user ${toDisplayName(user)}`,
      metadata: {
        realm: configuredRealm,
        fields: Object.keys(parsed.data),
      },
    })

    return apiSuccess(
      {
        id,
      },
      {
        message: `Updated Keycloak user ${toDisplayName(user)}.`,
      },
    )
  } catch (error) {
    if (error instanceof KeycloakApiError && error.status === 400) {
      const mapped = mapKeycloakValidationError(error)
      return apiProblemResponse({
        status: 422,
        error: mapped.error,
        detail: mapped.detail,
        issues: mapped.issues,
        source: "keycloak",
        upstream: error.payload,
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update Keycloak user",
      detail: "Keycloak user update failed",
      source: "keycloak",
    })
  }
}
