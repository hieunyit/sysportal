import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { createKeycloakAdminClient, epochToIso } from "@/lib/keycloak-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)
    if (isApiAuthResponse(auth)) return auth

    const { searchParams } = new URL(request.url)
    const days = Math.max(Number(searchParams.get("days") ?? "45"), 7)
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1)
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "20"), 1), 100)

    const client = await createKeycloakAdminClient()
    const thresholdMs = Date.now() - days * 24 * 60 * 60 * 1000

    // Fetch total count + recent login events in parallel
    const [totalCount, recentEvents] = await Promise.all([
      client.countUsers(),
      client.getRealmEvents({ types: ["LOGIN"], dateFrom: thresholdMs, max: 10000 }),
    ])

    // Build set of userIds who logged in within threshold window
    const activeUserIds = new Set<string>()
    for (const event of recentEvents) {
      if (event.userId) activeUserIds.add(event.userId)
    }

    // Page through all users in batches
    const allUsers: Array<{
      id?: string
      username?: string
      firstName?: string
      lastName?: string
      email?: string
      enabled?: boolean
      createdTimestamp?: number
    }> = []
    const batchSize = 200
    let offset = 0
    while (offset < Math.min(totalCount, 2000)) {
      const batch = await client.listUsers({ first: offset, max: batchSize })
      allUsers.push(...batch)
      if (batch.length < batchSize) break
      offset += batchSize
    }

    // Stale = enabled users with no LOGIN event in the threshold window
    const staleUsers = allUsers.filter(
      (u) => u.enabled !== false && u.id && !activeUserIds.has(u.id),
    )

    const total = staleUsers.length
    const start = (page - 1) * pageSize
    const items = staleUsers.slice(start, start + pageSize).map((u) => ({
      id: u.id ?? "",
      username: u.username ?? "",
      displayName:
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.username ||
        u.email ||
        u.id ||
        "",
      email: u.email ?? null,
      enabled: u.enabled ?? true,
      createdAt: u.createdTimestamp ? epochToIso(u.createdTimestamp) : null,
    }))

    return apiSuccess({
      items,
      total,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(total / pageSize), 1),
      thresholdDays: days,
      thresholdDate: new Date(thresholdMs).toISOString(),
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load stale accounts",
      detail: "Stale account report is unavailable",
      source: "keycloak",
    })
  }
}
