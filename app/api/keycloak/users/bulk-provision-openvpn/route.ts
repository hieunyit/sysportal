import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { appendAuditLog, getSystemConnection } from "@/lib/settings-store"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"
import { createOpenVpnAdminClient } from "@/lib/openvpn-admin"

export const runtime = "nodejs"

interface ProvisionResult {
  username: string
  status: "created" | "skipped" | "failed"
  error: string | null
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)
    if (isApiAuthResponse(auth)) return auth

    const body = (await request.json().catch(() => null)) as {
      userIds?: unknown
      vpnGroup?: unknown
    } | null

    const userIds = Array.isArray(body?.userIds)
      ? body.userIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      : []
    const vpnGroup = typeof body?.vpnGroup === "string" && body.vpnGroup.trim()
      ? body.vpnGroup.trim()
      : null

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

    const kcClient = await createKeycloakAdminClient()
    const vpnClient = await createOpenVpnAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm
    const results: ProvisionResult[] = []

    await Promise.all(
      userIds.map(async (userId) => {
        let username = userId
        try {
          const kcUser = await kcClient.getUser(userId)
          username = kcUser.username ?? kcUser.email ?? userId

          // Check if OpenVPN user already exists
          const existing = await vpnClient.getUser(username).catch(() => null)
          if (existing) {
            // If group specified and user exists, update their group
            if (vpnGroup) {
              await vpnClient.setUserProps([{ name: username, group: vpnGroup }])
            }
            results.push({ username, status: "skipped", error: null })
            return
          }

          // Create new OpenVPN user
          await vpnClient.createUser({ name: username, group: vpnGroup ?? undefined })

          appendAuditLog({
            actorName: auth.actorName,
            category: "edit",
            action: "openvpn.user.created",
            resourceType: "openvpn-user",
            resourceId: username,
            resourceName: username,
            detail: `Bulk provisioned OpenVPN user ${username}${vpnGroup ? ` into group ${vpnGroup}` : ""}`,
            metadata: { kcUserId: userId, realm: configuredRealm, group: vpnGroup },
          })

          results.push({ username, status: "created", error: null })
        } catch (err) {
          results.push({
            username,
            status: "failed",
            error: err instanceof Error ? err.message : "Provisioning failed",
          })
        }
      }),
    )

    const created = results.filter((r) => r.status === "created").length
    const skipped = results.filter((r) => r.status === "skipped").length
    const failed = results.filter((r) => r.status === "failed").length

    return apiSuccess(
      { results, created, skipped, failed },
      {
        message:
          failed === 0
            ? `Provisioned ${created} user(s) to OpenVPN${skipped > 0 ? `, ${skipped} already existed` : ""}.`
            : `Provisioning: ${created} created, ${skipped} skipped, ${failed} failed.`,
      },
    )
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Bulk provisioning failed",
      detail: "Unable to provision users to OpenVPN",
      source: "openvpn",
    })
  }
}
