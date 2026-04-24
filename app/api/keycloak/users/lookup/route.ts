import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { createKeycloakAdminClient, type KeycloakUserRepresentation } from "@/lib/keycloak-admin"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"

export const runtime = "nodejs"

function toDisplayName(user: KeycloakUserRepresentation) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email || user.id || "Unnamed user"
}

function getLdapEntryDn(user: KeycloakUserRepresentation) {
  const value = (user.attributes as Record<string, unknown> | undefined)?.LDAP_ENTRY_DN

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .find(Boolean) ?? null
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim()
  }

  return null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get("query")?.trim() ?? searchParams.get("search")?.trim() ?? ""
    const purpose = searchParams.get("purpose")?.trim().toLowerCase() ?? "manager"

    if (query.length < 2) {
      return apiSuccess({
        items: [],
        query,
      })
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const users = await client.listUsers({
      search: query,
      max: 12,
      briefRepresentation: false,
    })

    const hydratedUsers = await Promise.all(
      users.map(async (user) => {
        if (getLdapEntryDn(user) || !user.id) {
          return user
        }

        return client.getUser(user.id)
      }),
    )

    const items = hydratedUsers
      .map((user) => {
        const ldapEntryDn = getLdapEntryDn(user)

        if (purpose === "manager" && !ldapEntryDn) {
          return null
        }

        return {
          id: user.id ?? "",
          username: user.username ?? "",
          displayName: toDisplayName(user),
          email: user.email ?? "",
          ldapEntryDn: ldapEntryDn ?? "",
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))

    appendAuditLog({
      actorName: "Identity Admin",
      category: "access",
      action: "keycloak.user.lookup",
      resourceType: "keycloak-user",
      resourceId: query,
      resourceName: configuredRealm,
      detail: `Searched Keycloak users for manager lookup with query ${query}`,
      metadata: {
        realm: configuredRealm,
        query,
        purpose,
        total: items.length,
      },
    })

    return apiSuccess({
      items,
      query,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to search Keycloak users",
      detail: "Keycloak user lookup is unavailable",
      source: "keycloak",
    })
  }
}
