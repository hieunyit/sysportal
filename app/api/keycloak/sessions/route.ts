import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { getSystemConnection } from "@/lib/settings-store"
import {
  createKeycloakAdminClient,
  epochToIso,
  KeycloakApiError,
  type KeycloakEventRepresentation,
  type KeycloakUserRepresentation,
  type KeycloakUserSessionRepresentation,
} from "@/lib/keycloak-admin"

export const runtime = "nodejs"

const DEFAULT_PAGE_SIZE = 15
const MAX_PAGE_SIZE = 50
const DEFAULT_FAILED_LOGIN_THRESHOLD = 5
const DEFAULT_LOOKBACK_HOURS = 24
const USER_BATCH_SIZE = 100
const SESSION_BATCH_SIZE = 12
const EVENT_BATCH_SIZE = 100

interface ActiveSessionItem {
  id: string
  userId: string
  username: string
  displayName: string
  email: string
  enabled: boolean
  emailVerified: boolean
  federationLink: string | null
  ipAddress: string | null
  startAt: string | null
  lastAccessAt: string | null
  rememberMe: boolean
  clients: string[]
  transientUser: boolean
  recentLoginFailures: number
}

interface FailedLoginAlertItem {
  key: string
  userId: string | null
  username: string
  displayName: string
  email: string
  failureCount: number
  lastFailedAt: string | null
  lastIpAddress: string | null
  ipAddresses: string[]
  lastError: string | null
  bruteForceDisabled: boolean | null
  bruteForceFailureCount: number | null
}

function parseInteger(
  value: string | null,
  fallback: number,
  options?: {
    min?: number
    max?: number
  },
) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(Math.trunc(parsed), options?.min ?? Number.MIN_SAFE_INTEGER), options?.max ?? Number.MAX_SAFE_INTEGER)
}

function toDisplayName(user: KeycloakUserRepresentation) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email || user.id || "Unnamed user"
}

function getClientList(clients: KeycloakUserSessionRepresentation["clients"]) {
  return [...new Set(Object.values(clients ?? {}).map((value) => value.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  )
}

function firstNonEmptyString(values: Array<unknown>) {
  return (
    values
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .find(Boolean) ?? ""
  )
}

function getEventPrincipal(event: KeycloakEventRepresentation) {
  const details = event.details ?? {}

  return firstNonEmptyString([
    details.username,
    details.auth_username,
    details.authUsername,
    details.login_username,
    details.email,
    details.user,
  ])
}

function readBooleanFromUnknown(
  value: unknown,
  fallback: boolean | null = null,
) {
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true
    }

    if (value.toLowerCase() === "false") {
      return false
    }
  }

  return fallback
}

function readNumberFromUnknown(
  value: unknown,
  fallback: number | null = null,
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

function normalizeBruteForceStatus(status: Record<string, unknown>) {
  const disabled =
    readBooleanFromUnknown(status.disabled) ??
    readBooleanFromUnknown(status.temporarilyDisabled) ??
    readBooleanFromUnknown(status.permanentlyLockedOut) ??
    null

  const failureCount =
    readNumberFromUnknown(status.numFailures) ??
    readNumberFromUnknown(status.failureCount) ??
    readNumberFromUnknown(status.failures) ??
    null

  return {
    bruteForceDisabled: disabled,
    bruteForceFailureCount: failureCount,
  }
}

function matchesSearch(session: ActiveSessionItem, search: string) {
  if (!search) {
    return true
  }

  const normalizedSearch = search.toLowerCase()
  const haystack = [
    session.username,
    session.displayName,
    session.email,
    session.ipAddress ?? "",
    ...session.clients,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(normalizedSearch)
}

async function mapInBatches<T, TResult>(
  items: T[],
  batchSize: number,
  mapper: (item: T) => Promise<TResult>,
) {
  const results: TResult[] = []

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize)
    const batchResults = await Promise.all(batch.map((item) => mapper(item)))
    results.push(...batchResults)
  }

  return results
}

async function listAllUsers(
  client: Awaited<ReturnType<typeof createKeycloakAdminClient>>,
) {
  const total = await client.countUsers()
  const items: KeycloakUserRepresentation[] = []

  for (let first = 0; first < total; first += USER_BATCH_SIZE) {
    const batch = await client.listUsers({
      first,
      max: USER_BATCH_SIZE,
      briefRepresentation: true,
    })

    items.push(...batch)

    if (batch.length < USER_BATCH_SIZE) {
      break
    }
  }

  return items
}

async function listRecentLoginErrors(
  client: Awaited<ReturnType<typeof createKeycloakAdminClient>>,
  lookbackHours: number,
) {
  const items: KeycloakEventRepresentation[] = []
  const dateTo = Date.now()
  const dateFrom = dateTo - lookbackHours * 60 * 60 * 1000

  for (let first = 0; ; first += EVENT_BATCH_SIZE) {
    const batch = await client.getRealmEvents({
      types: ["LOGIN_ERROR"],
      first,
      max: EVENT_BATCH_SIZE,
      direction: "desc",
      dateFrom,
      dateTo,
    })

    items.push(...batch)

    if (batch.length < EVENT_BATCH_SIZE) {
      break
    }
  }

  return items
}

async function listActiveRealmSessions(
  client: Awaited<ReturnType<typeof createKeycloakAdminClient>>,
) {
  const [sessionStats, clients] = await Promise.all([
    client.getClientSessionStats(),
    client.listAllClients(),
  ])

  const clientUuidByClientId = new Map(
    clients
      .map((item) => {
        const clientId = item.clientId?.trim()
        const clientUuid = item.id?.trim()
        return clientId && clientUuid ? [clientId, clientUuid] as const : null
      })
      .filter(Boolean) as Array<readonly [string, string]>,
  )

  const activeClients = Object.entries(sessionStats)
    .map(([clientId, count]) => ({
      clientId,
      count: readNumberFromUnknown(count, 0) ?? 0,
      clientUuid: clientUuidByClientId.get(clientId) ?? null,
    }))
    .filter((item) => item.count > 0 && item.clientUuid)

  const sessionMap = new Map<string, KeycloakUserSessionRepresentation>()

  const sessionGroups = await mapInBatches(activeClients, SESSION_BATCH_SIZE, async (item) => {
    const sessions: KeycloakUserSessionRepresentation[] = []

    for (let first = 0; ; first += CLIENT_SESSION_PAGE_SIZE) {
      const page = await client.getClientUserSessions(item.clientUuid!, {
        first,
        max: CLIENT_SESSION_PAGE_SIZE,
      })

      sessions.push(...page)

      if (page.length < CLIENT_SESSION_PAGE_SIZE || sessions.length >= item.count) {
        break
      }
    }

    return {
      clientId: item.clientId,
      sessions,
    }
  })

  sessionGroups.forEach(({ clientId, sessions }) => {
    sessions.forEach((session) => {
      const sessionId = session.id?.trim()

      if (!sessionId) {
        return
      }

      const currentClients = {
        ...(session.clients ?? {}),
        [clientId]: clientId,
      }
      const existing = sessionMap.get(sessionId)

      if (!existing) {
        sessionMap.set(sessionId, {
          ...session,
          clients: currentClients,
        })
        return
      }

      const startCandidates = [existing.start, session.start].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      )
      const lastAccessCandidates = [existing.lastAccess, session.lastAccess].filter(
        (value): value is number => typeof value === "number" && Number.isFinite(value),
      )

      sessionMap.set(sessionId, {
        ...existing,
        username: existing.username ?? session.username,
        userId: existing.userId ?? session.userId,
        ipAddress: existing.ipAddress ?? session.ipAddress,
        start: startCandidates.length > 0 ? Math.min(...startCandidates) : undefined,
        lastAccess: lastAccessCandidates.length > 0 ? Math.max(...lastAccessCandidates) : undefined,
        rememberMe: existing.rememberMe ?? session.rememberMe,
        transientUser: existing.transientUser ?? session.transientUser,
        clients: {
          ...(existing.clients ?? {}),
          ...currentClients,
        },
      })
    })
  })

  return [...sessionMap.values()]
}

async function loadUsersByIds(
  client: Awaited<ReturnType<typeof createKeycloakAdminClient>>,
  userIds: string[],
) {
  const uniqueIds = [...new Set(userIds.map((item) => item.trim()).filter(Boolean))]
  const users = await mapInBatches(uniqueIds, SESSION_BATCH_SIZE, async (userId) => client.getUser(userId))
  const usersById = new Map<string, KeycloakUserRepresentation>()
  const usersByUsername = new Map<string, KeycloakUserRepresentation>()
  const usersByEmail = new Map<string, KeycloakUserRepresentation>()

  users.forEach((user) => {
    if (user.id) {
      usersById.set(user.id, user)
    }

    if (user.username?.trim()) {
      usersByUsername.set(user.username.trim().toLowerCase(), user)
    }

    if (user.email?.trim()) {
      usersByEmail.set(user.email.trim().toLowerCase(), user)
    }
  })

  return {
    usersById,
    usersByUsername,
    usersByEmail,
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search")?.trim() ?? ""
    const page = parseInteger(searchParams.get("page"), 1, { min: 1 })
    const pageSize = parseInteger(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE, {
      min: 1,
      max: MAX_PAGE_SIZE,
    })
    const failedLoginThreshold = parseInteger(
      searchParams.get("failedLoginThreshold"),
      DEFAULT_FAILED_LOGIN_THRESHOLD,
      { min: 1, max: 25 },
    )
    const lookbackHours = parseInteger(searchParams.get("lookbackHours"), DEFAULT_LOOKBACK_HOURS, {
      min: 1,
      max: 168,
    })

    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm

    const [realm, users, loginErrors] = await Promise.all([
      client.getRealm(),
      listAllUsers(client),
      listRecentLoginErrors(client, lookbackHours),
    ])

    const usersById = new Map<string, KeycloakUserRepresentation>()
    const usersByUsername = new Map<string, KeycloakUserRepresentation>()
    const usersByEmail = new Map<string, KeycloakUserRepresentation>()

    users.forEach((user) => {
      if (user.id) {
        usersById.set(user.id, user)
      }

      if (user.username?.trim()) {
        usersByUsername.set(user.username.trim().toLowerCase(), user)
      }

      if (user.email?.trim()) {
        usersByEmail.set(user.email.trim().toLowerCase(), user)
      }
    })

    const sessionUsers = users.filter((user) => user.id)
    const sessionGroups = await mapInBatches(sessionUsers, SESSION_BATCH_SIZE, async (user) => ({
      user,
      sessions: await client.getUserSessions(user.id!),
    }))

    const failureCountsByUserId = new Map<string, number>()
    const failureCountsByUsername = new Map<string, number>()
    const alertsMap = new Map<
      string,
      {
        key: string
        userId: string | null
        username: string
        displayName: string
        email: string
        failureCount: number
        lastFailedAt: string | null
        lastFailedAtValue: number
        lastIpAddress: string | null
        ipAddresses: Set<string>
        lastError: string | null
      }
    >()

    loginErrors.forEach((event) => {
      const principal = getEventPrincipal(event)
      const user =
        (event.userId ? usersById.get(event.userId) : undefined) ??
        (principal ? usersByUsername.get(principal.toLowerCase()) : undefined) ??
        (principal ? usersByEmail.get(principal.toLowerCase()) : undefined)

      const key = user?.id ?? event.userId ?? principal.toLowerCase()

      if (!key) {
        return
      }

      const displayName = user ? toDisplayName(user) : principal || "Unknown user"
      const username = user?.username ?? principal
      const email = user?.email ?? ""
      const occurredAt = event.time ?? 0
      const ipAddress = event.ipAddress?.trim() || null
      const lastError = event.error?.trim() || null
      const existing = alertsMap.get(key)

      if (user?.id) {
        failureCountsByUserId.set(user.id, (failureCountsByUserId.get(user.id) ?? 0) + 1)
      } else if (username) {
        const usernameKey = username.toLowerCase()
        failureCountsByUsername.set(usernameKey, (failureCountsByUsername.get(usernameKey) ?? 0) + 1)
      }

      if (existing) {
        existing.failureCount += 1

        if (occurredAt >= existing.lastFailedAtValue) {
          existing.lastFailedAtValue = occurredAt
          existing.lastFailedAt = epochToIso(occurredAt) ?? null
          existing.lastIpAddress = ipAddress
          existing.lastError = lastError
        }

        if (ipAddress) {
          existing.ipAddresses.add(ipAddress)
        }

        return
      }

      alertsMap.set(key, {
        key,
        userId: user?.id ?? event.userId ?? null,
        username,
        displayName,
        email,
        failureCount: 1,
        lastFailedAt: epochToIso(occurredAt) ?? null,
        lastFailedAtValue: occurredAt,
        lastIpAddress: ipAddress,
        ipAddresses: new Set(ipAddress ? [ipAddress] : []),
        lastError,
      })
    })

    const activeSessions = sessionGroups
      .flatMap(({ user, sessions }) =>
        sessions.map((session) => {
          const recentLoginFailures =
            (user.id ? failureCountsByUserId.get(user.id) : undefined) ??
            (user.username?.trim() ? failureCountsByUsername.get(user.username.trim().toLowerCase()) : undefined) ??
            0

          return {
            id: session.id ?? "",
            userId: user.id ?? "",
            username: user.username ?? session.username ?? "",
            displayName: toDisplayName(user),
            email: user.email ?? "",
            enabled: Boolean(user.enabled),
            emailVerified: Boolean(user.emailVerified),
            federationLink: user.federationLink ?? null,
            ipAddress: session.ipAddress ?? null,
            startAt: epochToIso(session.start) ?? null,
            lastAccessAt: epochToIso(session.lastAccess) ?? null,
            rememberMe: Boolean(session.rememberMe),
            clients: getClientList(session.clients),
            transientUser: Boolean(session.transientUser),
            recentLoginFailures,
          } satisfies ActiveSessionItem
        }),
      )
      .sort((left, right) => {
        const leftValue = Date.parse(left.lastAccessAt ?? left.startAt ?? "") || 0
        const rightValue = Date.parse(right.lastAccessAt ?? right.startAt ?? "") || 0
        return rightValue - leftValue
      })

    const alertCandidates = [...alertsMap.values()]
      .filter((item) => item.failureCount >= failedLoginThreshold)
      .sort((left, right) => {
        if (right.failureCount !== left.failureCount) {
          return right.failureCount - left.failureCount
        }

        return right.lastFailedAtValue - left.lastFailedAtValue
      })

    const alerts = await mapInBatches(alertCandidates, SESSION_BATCH_SIZE, async (item) => {
      if (!item.userId) {
        return {
          key: item.key,
          userId: null,
          username: item.username,
          displayName: item.displayName,
          email: item.email,
          failureCount: item.failureCount,
          lastFailedAt: item.lastFailedAt,
          lastIpAddress: item.lastIpAddress,
          ipAddresses: [...item.ipAddresses],
          lastError: item.lastError,
          bruteForceDisabled: null,
          bruteForceFailureCount: null,
        } satisfies FailedLoginAlertItem
      }

      try {
        const status = await client.getBruteForceStatus(item.userId)
        const normalizedStatus = normalizeBruteForceStatus(status)

        return {
          key: item.key,
          userId: item.userId,
          username: item.username,
          displayName: item.displayName,
          email: item.email,
          failureCount: item.failureCount,
          lastFailedAt: item.lastFailedAt,
          lastIpAddress: item.lastIpAddress,
          ipAddresses: [...item.ipAddresses],
          lastError: item.lastError,
          ...normalizedStatus,
        } satisfies FailedLoginAlertItem
      } catch {
        return {
          key: item.key,
          userId: item.userId,
          username: item.username,
          displayName: item.displayName,
          email: item.email,
          failureCount: item.failureCount,
          lastFailedAt: item.lastFailedAt,
          lastIpAddress: item.lastIpAddress,
          ipAddresses: [...item.ipAddresses],
          lastError: item.lastError,
          bruteForceDisabled: null,
          bruteForceFailureCount: null,
        } satisfies FailedLoginAlertItem
      }
    })

    const filteredSessions = activeSessions.filter((session) => matchesSearch(session, search))
    const total = filteredSessions.length
    const pageCount = Math.max(Math.ceil(total / pageSize), 1)
    const normalizedPage = Math.min(page, pageCount)
    const pagedItems = filteredSessions.slice((normalizedPage - 1) * pageSize, normalizedPage * pageSize)

    const clientCounts = new Map<string, number>()

    activeSessions.forEach((session) => {
      session.clients.forEach((clientId) => {
        clientCounts.set(clientId, (clientCounts.get(clientId) ?? 0) + 1)
      })
    })

    const warnings: string[] = []

    if (!realm.bruteForceProtected) {
      warnings.push(
        "Realm brute-force protection is currently disabled. The repeated-login panel is based on recent LOGIN_ERROR events and does not mean Keycloak will automatically lock the account.",
      )
    }

    return NextResponse.json({
      summary: {
        realm: realm.realm ?? configuredRealm,
        displayName: realm.displayName ?? null,
        bruteForceProtected: Boolean(realm.bruteForceProtected),
        activeSessions: activeSessions.length,
        activeUsers: new Set(activeSessions.map((session) => session.userId).filter(Boolean)).size,
        monitoredUsers: users.length,
        failedLoginThreshold,
        failedLoginLookbackHours: lookbackHours,
        repeatedLoginAlerts: alerts.length,
        topClients: [...clientCounts.entries()]
          .sort((left, right) => right[1] - left[1])
          .slice(0, 5)
          .map(([clientId, count]) => ({
            clientId,
            count,
          })),
      },
      alerts,
      items: pagedItems,
      total,
      page: normalizedPage,
      pageSize,
      pageCount,
      search,
      warnings,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load Keycloak sessions",
        detail: getErrorDetail(error, "Keycloak session inventory is unavailable"),
      },
      { status: error instanceof KeycloakApiError ? error.status : 500 },
    )
  }
}
