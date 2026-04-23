import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import {
  createKeycloakAdminClient,
  KeycloakApiError,
  type KeycloakAdminEventRepresentation,
} from "@/lib/keycloak-admin"

export const runtime = "nodejs"

function normalizeAdminEvent(event: KeycloakAdminEventRepresentation) {
  return {
    id: event.id ?? crypto.randomUUID(),
    occurredAt: event.time ? new Date(event.time).toISOString() : null,
    operationType: event.operationType ?? null,
    resourceType: event.resourceType ?? null,
    resourcePath: event.resourcePath ?? null,
    actorUserId: event.authDetails?.userId ?? null,
    actorUsername: event.authDetails?.username ?? null,
    clientId: event.authDetails?.clientId ?? null,
    ipAddress: event.authDetails?.ipAddress ?? null,
    error: event.error ?? null,
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

    const [realm, allGroups] = await Promise.all([client.getRealm(), client.listAllGroups()])
    const group = allGroups.find((item) => item.id === id)

    if (!group) {
      return NextResponse.json({ error: "Keycloak group not found" }, { status: 404 })
    }

    const [members, roleMappings, adminEvents] = await Promise.all([
      client.getGroupMembers(id),
      client.getGroupRoleMappings(id),
      safeSection(
        () =>
          client.getAdminEvents({
            resourceTypes: ["GROUP"],
            max: 200,
            direction: "desc",
          }),
        "Group admin events are unavailable",
      ),
    ])

    const relatedGroups = allGroups.filter((item) => item.parentPath === group.path)
    const ancestry = allGroups.filter(
      (item) => item.path !== group.path && group.path.startsWith(`${item.path}/`),
    )
    const filteredAdminEvents = (adminEvents.data ?? []).filter((event) =>
      (event.resourcePath ?? "").startsWith(`groups/${id}`),
    )
    const warnings = [adminEvents.warning].filter(Boolean)

    return NextResponse.json({
      summary: {
        realm: realm.realm ?? configuredRealm,
        displayName: realm.displayName ?? null,
      },
      group: {
        id: group.id,
        name: group.name,
        path: group.path,
        description: group.description ?? null,
        parentId: group.parentId ?? null,
        parentPath: group.parentPath,
        depth: group.depth,
        subGroupCount: group.subGroupCount ?? 0,
        attributes: group.attributes ?? {},
        realmRoles: group.realmRoles ?? [],
        clientRoles: group.clientRoles ?? {},
      },
      ancestry: ancestry.sort((left, right) => left.depth - right.depth).map((item) => ({
        id: item.id,
        name: item.name,
        path: item.path,
      })),
      subGroups: relatedGroups.map((item) => ({
        id: item.id,
        name: item.name,
        path: item.path,
        description: item.description ?? null,
        subGroupCount: item.subGroupCount ?? 0,
      })),
      members: members.map((member) => ({
        id: member.id ?? "",
        username: member.username ?? "",
        displayName: [member.firstName, member.lastName].filter(Boolean).join(" ").trim() || member.username || "",
        email: member.email ?? "",
        enabled: Boolean(member.enabled),
        emailVerified: Boolean(member.emailVerified),
        createdAt: member.createdTimestamp ? new Date(member.createdTimestamp).toISOString() : null,
        requiredActions: member.requiredActions ?? [],
      })),
      roleMappings,
      adminEvents: filteredAdminEvents.map(normalizeAdminEvent),
      warnings,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load Keycloak group detail",
        detail: getErrorDetail(error, "Keycloak group detail is unavailable"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const payload = (await request.json().catch(() => null)) as
      | { name?: unknown; description?: unknown }
      | null
    const name = typeof payload?.name === "string" ? payload.name.trim() : ""
    const description =
      typeof payload?.description === "string" && payload.description.trim()
        ? payload.description.trim()
        : ""

    if (!name) {
      return NextResponse.json(
        {
          error: "Invalid Keycloak group payload",
          issues: [
            {
              path: "name",
              message: "Group name is required",
            },
          ],
        },
        { status: 422 },
      )
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const current = await client.getGroup(id)

    await client.updateGroup(id, {
      ...current,
      name,
      description: description || undefined,
    })

    const updated = await client.getGroup(id)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "keycloak.group.updated",
      resourceType: "keycloak-group",
      resourceId: updated.id ?? id,
      resourceName: updated.path ?? updated.name ?? id,
      detail: `Updated Keycloak group ${updated.path ?? updated.name ?? id}`,
      metadata: {
        realm: configuredRealm,
      },
    })

    return NextResponse.json({
      id: updated.id ?? id,
      name: updated.name ?? name,
      path: updated.path ?? null,
      description: updated.description ?? null,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to update Keycloak group",
        detail: getErrorDetail(error, "Keycloak group update failed"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
