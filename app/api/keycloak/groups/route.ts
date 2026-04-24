import { createKeycloakAdminClient } from "@/lib/keycloak-admin"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1)
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "18"), 1), 200)
    const search = searchParams.get("search")?.trim().toLowerCase() ?? ""
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm

    const [realm, totalGroups, topLevelGroups, allGroups] = await Promise.all([
      client.getRealm(),
      client.countGroups(),
      client.countGroups(undefined, true),
      client.listAllGroups(),
    ])

    const filteredGroups = search
      ? allGroups.filter((group) => {
          const terms = [group.name, group.path, group.description ?? ""].join(" ").toLowerCase()
          return terms.includes(search)
        })
      : allGroups

    const start = (page - 1) * pageSize
    const items = filteredGroups.slice(start, start + pageSize).map((group) => ({
      id: group.id,
      name: group.name,
      path: group.path,
      description: group.description ?? null,
      parentId: group.parentId ?? null,
      parentPath: group.parentPath,
      depth: group.depth,
      subGroupCount: group.subGroupCount ?? 0,
      attributeCount: Object.keys(group.attributes ?? {}).length,
      realmRoleCount: group.realmRoles?.length ?? 0,
      clientRoleCount: Object.values(group.clientRoles ?? {}).reduce(
        (total, roles) => total + roles.length,
        0,
      ),
    }))

    return apiSuccess({
      summary: {
        realm: realm.realm ?? configuredRealm,
        displayName: realm.displayName ?? null,
        totalGroups,
        topLevelGroups,
        nestedGroups: Math.max(totalGroups - topLevelGroups, 0),
      },
      items,
      total: filteredGroups.length,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(filteredGroups.length / pageSize), 1),
      search,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load Keycloak groups",
      detail: "Keycloak group inventory is unavailable",
      source: "keycloak",
    })
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as
      | { name?: unknown; description?: unknown }
      | null

    const name = typeof payload?.name === "string" ? payload.name.trim() : ""
    const description =
      typeof payload?.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : undefined

    if (!name) {
      return apiValidationError({
        error: "Invalid Keycloak group payload",
        issues: [{ path: "name", message: "Group name is required" }],
        source: "keycloak",
      })
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const created = await client.createGroup({
      name,
      description,
    })
    const group = created.groupId ? await client.getGroup(created.groupId) : null

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.group.created",
      resourceType: "keycloak-group",
      resourceId: group?.id ?? created.groupId ?? name,
      resourceName: group?.path ?? group?.name ?? name,
      detail: `Created Keycloak group ${group?.path ?? name}`,
      metadata: {
        realm: configuredRealm,
      },
    })

    return apiSuccess(
      {
        id: group?.id ?? created.groupId ?? null,
        name: group?.name ?? name,
        path: group?.path ?? null,
        description: group?.description ?? description ?? null,
      },
      {
        status: 201,
        message: `Created Keycloak group ${group?.path ?? name}.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to create Keycloak group",
      detail: "Keycloak group create failed",
      source: "keycloak",
    })
  }
}
