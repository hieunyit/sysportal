import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient, type KeycloakGroupRepresentation } from "@/lib/keycloak-admin"

function resolveGroup(
  groups: KeycloakGroupRepresentation[],
  identifier: string,
): KeycloakGroupRepresentation | null {
  const byId = groups.find((g) => g.id === identifier)
  if (byId) return byId

  const normalized = identifier.trim().toLowerCase()
  const byPath =
    groups.find((g) => g.path?.trim().toLowerCase() === normalized) ??
    (!identifier.startsWith("/")
      ? groups.find((g) => g.path?.trim().toLowerCase() === `/${normalized}`)
      : undefined)
  if (byPath) return byPath

  const byName = groups.filter((g) => g.name?.trim().toLowerCase() === normalized)
  if (byName.length === 1) return byName[0]
  if (byName.length > 1) return null // ambiguous

  return null
}

export const runtime = "nodejs"

interface BulkResult {
  userId: string
  username: string
  success: boolean
  error: string | null
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const body = (await request.json().catch(() => null)) as {
      action?: unknown
      userIds?: unknown
      groupId?: unknown
    } | null

    const action = typeof body?.action === "string" ? body.action : ""
    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : []
    const groupId = typeof body?.groupId === "string" ? body.groupId.trim() : ""

    if (!["enable", "disable", "assignGroup"].includes(action)) {
      return apiValidationError({
        error: "Invalid bulk action",
        issues: [{ path: "action", message: "Must be enable, disable, or assignGroup" }],
      })
    }

    if (userIds.length === 0) {
      return apiValidationError({
        error: "No users selected",
        issues: [{ path: "userIds", message: "At least one user ID is required" }],
      })
    }

    if (userIds.length > 100) {
      return apiValidationError({
        error: "Too many users selected",
        issues: [{ path: "userIds", message: "Maximum 100 users per bulk operation" }],
      })
    }

    if (action === "assignGroup" && !groupId) {
      return apiValidationError({
        error: "Invalid bulk action",
        issues: [{ path: "groupId", message: "Group ID is required for assignGroup action" }],
      })
    }

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const results: BulkResult[] = []

    if (action === "enable" || action === "disable") {
      const enabled = action === "enable"
      const label = enabled ? "enabled" : "disabled"

      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const user = await client.getUser(userId)
            await client.updateUser(userId, { enabled })

            appendAuditLog({
              actorName: auth.actorName,
              category: "edit",
              action: `keycloak.user.${label}`,
              resourceType: "keycloak-user",
              resourceId: userId,
              resourceName: user.username ?? user.email ?? userId,
              detail: `Bulk ${label} Keycloak user ${user.username ?? userId}`,
              metadata: { realm: configuredRealm },
            })

            results.push({ userId, username: user.username ?? userId, success: true, error: null })
          } catch (err) {
            results.push({
              userId,
              username: userId,
              success: false,
              error: err instanceof Error ? err.message : `Failed to ${label} user`,
            })
          }
        }),
      )
    }

    if (action === "assignGroup") {
      const allGroups = await client.listAllGroups()
      const resolvedGroup = resolveGroup(allGroups, groupId)

      if (!resolvedGroup?.id) {
        const nameMatches = allGroups.filter(
          (g) => g.name?.trim().toLowerCase() === groupId.trim().toLowerCase(),
        )
        const ambiguous = nameMatches.length > 1
        return apiValidationError({
          error: "Group not found",
          issues: [
            {
              path: "groupId",
              message: ambiguous
                ? `Group "${groupId}" matches multiple groups. Use a full path (e.g. /org/team) or group ID.`
                : `Group "${groupId}" was not found in Keycloak.`,
            },
          ],
        })
      }

      const resolvedGroupId = resolvedGroup.id
      const groupLabel = resolvedGroup.path ?? resolvedGroup.name ?? groupId

      await Promise.all(
        userIds.map(async (userId) => {
          try {
            const user = await client.getUser(userId)
            await client.addUserToGroup(userId, resolvedGroupId)

            appendAuditLog({
              actorName: auth.actorName,
              category: "edit",
              action: "keycloak.user.group-added",
              resourceType: "keycloak-user",
              resourceId: userId,
              resourceName: user.username ?? user.email ?? userId,
              detail: `Bulk assigned ${user.username ?? userId} to group ${groupLabel}`,
              metadata: { realm: configuredRealm, groupId: resolvedGroupId },
            })

            results.push({ userId, username: user.username ?? userId, success: true, error: null })
          } catch (err) {
            results.push({
              userId,
              username: userId,
              success: false,
              error: err instanceof Error ? err.message : "Failed to assign group",
            })
          }
        }),
      )
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    return apiSuccess(
      { results, successCount, failureCount },
      {
        message:
          failureCount === 0
            ? `Bulk ${action} completed for ${successCount} user(s).`
            : `Bulk ${action} completed: ${successCount} succeeded, ${failureCount} failed.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Bulk operation failed",
      detail: "Unable to complete bulk user operation",
      source: "keycloak",
    })
  }
}
