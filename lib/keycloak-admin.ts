import { getSystemConnection, type KeycloakConnectionRecord } from "@/lib/settings-store"

type KeycloakQueryValue = string | number | boolean | null | undefined
type KeycloakRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

interface KeycloakTokenResponse {
  access_token?: string
  expires_in?: number
  token_type?: string
  error?: string
  error_description?: string
}

export interface KeycloakRealmRepresentation {
  id?: string
  realm?: string
  displayName?: string
  enabled?: boolean
  loginWithEmailAllowed?: boolean
  duplicateEmailsAllowed?: boolean
  registrationAllowed?: boolean
  rememberMe?: boolean
  verifyEmail?: boolean
  resetPasswordAllowed?: boolean
  editUsernameAllowed?: boolean
  bruteForceProtected?: boolean
  ssoSessionIdleTimeout?: number
  ssoSessionMaxLifespan?: number
}

export interface KeycloakEventsConfigRepresentation {
  eventsEnabled?: boolean
  eventsExpiration?: number
  eventsListeners?: string[]
  enabledEventTypes?: string[]
  adminEventsEnabled?: boolean
  adminEventsDetailsEnabled?: boolean
}

export interface KeycloakRoleRepresentation {
  id?: string
  name?: string
  description?: string
  composite?: boolean
  clientRole?: boolean
  containerId?: string
  attributes?: Record<string, string[]>
}

export interface KeycloakMappingsRepresentation {
  realmMappings?: KeycloakRoleRepresentation[]
  clientMappings?: Record<
    string,
    {
      id?: string
      client?: string
      mappings?: KeycloakRoleRepresentation[]
    }
  >
}

export interface KeycloakGroupRepresentation {
  id?: string
  name?: string
  description?: string
  path?: string
  parentId?: string
  subGroupCount?: number
  subGroups?: KeycloakGroupRepresentation[]
  attributes?: Record<string, string[]>
  realmRoles?: string[]
  clientRoles?: Record<string, string[]>
  access?: Record<string, boolean>
}

export interface KeycloakClientRepresentation {
  id?: string
  clientId?: string
  name?: string
  description?: string
  enabled?: boolean
  protocol?: string
}

export interface FlattenedKeycloakGroup extends KeycloakGroupRepresentation {
  id: string
  name: string
  path: string
  depth: number
  parentPath: string | null
}

interface KeycloakUserProfileAttributeMetadata {
  name?: string
  displayName?: string
  required?: boolean | { roles?: string[] }
  readOnly?: boolean
  multivalued?: boolean
  annotations?: Record<string, string>
  validators?: Record<string, unknown>
}

export interface KeycloakUserProfileMetadata {
  attributes?: KeycloakUserProfileAttributeMetadata[]
  groups?: Array<{
    name?: string
    displayHeader?: string
    displayDescription?: string
  }>
}

export interface KeycloakUserRepresentation {
  id?: string
  username?: string
  firstName?: string
  lastName?: string
  email?: string
  enabled?: boolean
  emailVerified?: boolean
  createdTimestamp?: number
  origin?: string
  totp?: boolean
  attributes?: Record<string, string[]>
  requiredActions?: string[]
  federationLink?: string
  access?: Record<string, boolean>
  disableableCredentialTypes?: string[]
  notBefore?: number
  userProfileMetadata?: KeycloakUserProfileMetadata | Record<string, unknown>
}

export interface KeycloakCredentialRepresentation {
  id?: string
  type?: string
  userLabel?: string
  createdDate?: number
  secretData?: string
  credentialData?: string
  priority?: number
  temporary?: boolean
  device?: string
}

export interface KeycloakUserSessionRepresentation {
  id?: string
  username?: string
  userId?: string
  ipAddress?: string
  start?: number
  lastAccess?: number
  rememberMe?: boolean
  clients?: Record<string, string>
  transientUser?: boolean
}

export interface KeycloakEventRepresentation {
  id?: string
  time?: number
  type?: string
  realmId?: string
  clientId?: string
  userId?: string
  sessionId?: string
  ipAddress?: string
  error?: string
  details?: Record<string, string>
}

export interface KeycloakAdminEventRepresentation {
  id?: string
  time?: number
  realmId?: string
  authDetails?: {
    realmId?: string
    clientId?: string
    userId?: string
    ipAddress?: string
    username?: string
  }
  operationType?: string
  resourceType?: string
  resourcePath?: string
  representation?: string
  error?: string
  details?: Record<string, string>
}

export interface KeycloakFederatedIdentityRepresentation {
  identityProvider?: string
  userId?: string
  userName?: string
}

export interface KeycloakComponentRepresentation {
  id?: string
  name?: string
  providerId?: string
  providerType?: string
  parentId?: string
  subType?: string
  config?: Record<string, string[]>
}

export class KeycloakApiError extends Error {
  status: number
  detail?: string

  constructor(message: string, status: number, detail?: string) {
    super(message)
    this.name = "KeycloakApiError"
    this.status = status
    this.detail = detail
  }
}

declare global {
  var __identityOpsKeycloakTokenCache__:
    | Map<string, { accessToken: string; expiresAt: number }>
    | undefined
}

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function getKeycloakConfig() {
  return getSystemConnection("keycloak").config as KeycloakConnectionRecord
}

function getTokenCache() {
  if (!globalThis.__identityOpsKeycloakTokenCache__) {
    globalThis.__identityOpsKeycloakTokenCache__ = new Map()
  }

  return globalThis.__identityOpsKeycloakTokenCache__
}

function getTokenCacheKey(config: KeycloakConnectionRecord) {
  return [config.serverUrl, config.realm, config.clientId, config.clientSecret].join("::")
}

function getQueryString(query?: Record<string, KeycloakQueryValue | KeycloakQueryValue[]>) {
  const searchParams = new URLSearchParams()

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== null && item !== undefined && `${item}` !== "") {
          searchParams.append(key, String(item))
        }
      })
      return
    }

    if (value === null || value === undefined || `${value}` === "") {
      return
    }

    searchParams.set(key, String(value))
  })

  const serialized = searchParams.toString()
  return serialized ? `?${serialized}` : ""
}

function readErrorDetail(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) {
    return payload
  }

  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as {
    error?: string
    detail?: string
    message?: string
    error_description?: string
  }

  return response.error_description ?? response.detail ?? response.error ?? response.message ?? fallback
}

function toNumberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  if (value && typeof value === "object") {
    const firstNumericValue = Object.values(value as Record<string, unknown>).find((item) =>
      typeof item === "number" || (typeof item === "string" && item.trim()),
    )

    return toNumberFromUnknown(firstNumericValue)
  }

  return 0
}

export function epochToIso(value?: number | null) {
  if (!value || !Number.isFinite(value)) {
    return null
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

async function requestAccessToken(config: KeycloakConnectionRecord) {
  const baseUrl = trimTrailingSlash(config.serverUrl)
  const realm = config.realm.trim()
  const timeoutMs = Math.max(config.timeoutSeconds, 1) * 1000
  const cacheKey = getTokenCacheKey(config)
  const cached = getTokenCache().get(cacheKey)

  if (cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.accessToken
  }

  if (!baseUrl || !realm || !config.clientId.trim() || !config.clientSecret.trim()) {
    throw new Error("Keycloak connection is incomplete. Server URL, realm, client ID, and client secret are required.")
  }

  const discoveryResponse = await fetch(`${baseUrl}/realms/${realm}/.well-known/openid-configuration`, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  })

  const discoveryPayload = (await discoveryResponse.json().catch(() => null)) as
    | { token_endpoint?: string }
    | null

  if (!discoveryResponse.ok || !discoveryPayload?.token_endpoint) {
    throw new KeycloakApiError(
      "Unable to discover the Keycloak token endpoint.",
      discoveryResponse.status,
      readErrorDetail(discoveryPayload, "OIDC discovery failed."),
    )
  }

  const tokenBody = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  const tokenResponse = await fetch(discoveryPayload.token_endpoint, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenBody.toString(),
    signal: AbortSignal.timeout(timeoutMs),
  })

  const tokenPayload = (await tokenResponse.json().catch(() => null)) as KeycloakTokenResponse | null

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    throw new KeycloakApiError(
      "Unable to obtain a Keycloak admin access token.",
      tokenResponse.status,
      readErrorDetail(tokenPayload, "Client credentials flow failed."),
    )
  }

  const expiresAt = Date.now() + Math.max((tokenPayload.expires_in ?? 60) - 15, 15) * 1000
  getTokenCache().set(cacheKey, {
    accessToken: tokenPayload.access_token,
    expiresAt,
  })

  return tokenPayload.access_token
}

async function keycloakRequestResponse<T>(
  config: KeycloakConnectionRecord,
  path: string,
  options?: {
    query?: Record<string, KeycloakQueryValue | KeycloakQueryValue[]>
    method?: KeycloakRequestMethod
    body?: unknown
  },
) {
  const baseUrl = trimTrailingSlash(config.serverUrl)
  const realm = config.realm.trim()
  const timeoutMs = Math.max(config.timeoutSeconds, 1) * 1000
  const accessToken = await requestAccessToken(config)
  const query = getQueryString(options?.query)
  const headers = new Headers({
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  })

  if (options?.body !== undefined) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${baseUrl}/admin/realms/${realm}${path}${query}`, {
    method: options?.method ?? "GET",
    cache: "no-store",
    headers,
    body: options?.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(timeoutMs),
  })

  const rawPayload = await response.text().catch(() => "")
  let payload: T | string | null = null

  if (rawPayload.trim()) {
    try {
      payload = JSON.parse(rawPayload) as T
    } catch {
      payload = rawPayload
    }
  }

  if (!response.ok) {
    throw new KeycloakApiError(
      `Keycloak request failed for ${path}.`,
      response.status,
      readErrorDetail(payload, `HTTP ${response.status}`),
    )
  }

  return {
    response,
    payload,
  }
}

async function keycloakRequest<T>(
  config: KeycloakConnectionRecord,
  path: string,
  options?: {
    query?: Record<string, KeycloakQueryValue | KeycloakQueryValue[]>
    method?: KeycloakRequestMethod
    body?: unknown
    expect?: "json" | "void"
  },
) {
  const { payload } = await keycloakRequestResponse<T>(config, path, options)

  if (options?.expect === "void") {
    return undefined as T
  }

  return payload as T
}

async function listAllPages<T>(
  fetchPage: (first: number, max: number) => Promise<T[]>,
  pageSize = 100,
  totalHint?: number,
) {
  const items: T[] = []
  let offset = 0

  while (true) {
    const page = await fetchPage(offset, pageSize)

    if (page.length === 0) {
      break
    }

    items.push(...page)
    offset += page.length

    if (page.length < pageSize) {
      break
    }

    if (typeof totalHint === "number" && items.length >= totalHint) {
      break
    }
  }

  return items
}

export function flattenGroupHierarchy(
  groups: KeycloakGroupRepresentation[],
  depth = 0,
  parentPath: string | null = null,
): FlattenedKeycloakGroup[] {
  return groups.flatMap((group) => {
    if (!group.id || !group.name) {
      return []
    }

    const path = group.path ?? `${parentPath ?? ""}/${group.name}`.replace(/\/+/g, "/")
    const current: FlattenedKeycloakGroup = {
      ...group,
      id: group.id,
      name: group.name,
      path,
      depth,
      parentPath,
    }

    return [
      current,
      ...flattenGroupHierarchy(group.subGroups ?? [], depth + 1, path),
    ]
  })
}

export async function createKeycloakAdminClient(configInput?: KeycloakConnectionRecord) {
  const config = configInput ?? getKeycloakConfig()

  return {
    config,
    async getRealm() {
      return keycloakRequest<KeycloakRealmRepresentation>(config, "")
    },
    async getEventsConfig() {
      return keycloakRequest<KeycloakEventsConfigRepresentation>(config, "/events/config")
    },
    async countUsers(filters?: {
      search?: string
      enabled?: boolean
      emailVerified?: boolean
    }) {
      const payload = await keycloakRequest<unknown>(config, "/users/count", {
        query: {
          search: filters?.search,
          enabled: filters?.enabled,
          emailVerified: filters?.emailVerified,
        },
      })

      return toNumberFromUnknown(payload)
    },
    async listUsers(options?: {
      search?: string
      first?: number
      max?: number
      briefRepresentation?: boolean
    }) {
      return keycloakRequest<KeycloakUserRepresentation[]>(config, "/users", {
        query: {
          search: options?.search,
          first: options?.first,
          max: options?.max,
          briefRepresentation: options?.briefRepresentation ?? false,
        },
      })
    },
    async getUser(userId: string) {
      return keycloakRequest<KeycloakUserRepresentation>(config, `/users/${encodeURIComponent(userId)}`, {
        query: {
          userProfileMetadata: true,
        },
      })
    },
    async getUserProfileMetadata() {
      return keycloakRequest<KeycloakUserProfileMetadata>(config, "/users/profile/metadata")
    },
    async getComponent(componentId: string) {
      return keycloakRequest<KeycloakComponentRepresentation>(
        config,
        `/components/${encodeURIComponent(componentId)}`,
      )
    },
    async updateComponent(componentId: string, payload: KeycloakComponentRepresentation) {
      await keycloakRequest<void>(config, `/components/${encodeURIComponent(componentId)}`, {
        method: "PUT",
        body: payload,
        expect: "void",
      })
    },
    async createUser(payload: Partial<KeycloakUserRepresentation>) {
      const { response } = await keycloakRequestResponse<unknown>(config, "/users", {
        method: "POST",
        body: payload,
      })
      const location = response.headers.get("location")
      const userId = location?.split("/").filter(Boolean).pop() ?? null

      return {
        location,
        userId,
      }
    },
    async updateUser(userId: string, payload: Partial<KeycloakUserRepresentation>) {
      await keycloakRequest<void>(config, `/users/${encodeURIComponent(userId)}`, {
        method: "PUT",
        body: payload,
        expect: "void",
      })
    },
    async getUserCredentials(userId: string) {
      return keycloakRequest<KeycloakCredentialRepresentation[]>(
        config,
        `/users/${encodeURIComponent(userId)}/credentials`,
      )
    },
    async deleteUserCredential(userId: string, credentialId: string) {
      await keycloakRequest<void>(
        config,
        `/users/${encodeURIComponent(userId)}/credentials/${encodeURIComponent(credentialId)}`,
        {
          method: "DELETE",
          expect: "void",
        },
      )
    },
    async resetUserOtp(userId: string) {
      const credentials = await this.getUserCredentials(userId)
      const otpCredentials = credentials.filter((credential) => (credential.type ?? "").toLowerCase() === "otp")

      await Promise.all(
        otpCredentials
          .filter((credential) => credential.id)
          .map((credential) => this.deleteUserCredential(userId, credential.id!)),
      )

      return {
        removedCount: otpCredentials.length,
      }
    },
    async resetUserPassword(
      userId: string,
      payload: {
        password: string
        temporary?: boolean
      },
    ) {
      await keycloakRequest<void>(config, `/users/${encodeURIComponent(userId)}/reset-password`, {
        method: "PUT",
        body: {
          type: "password",
          value: payload.password,
          temporary: Boolean(payload.temporary),
        },
        expect: "void",
      })
    },
    async logoutUser(userId: string) {
      await keycloakRequest<void>(config, `/users/${encodeURIComponent(userId)}/logout`, {
        method: "POST",
        expect: "void",
      })
    },
    async clearUserLoginFailures(userId: string) {
      await keycloakRequest<void>(
        config,
        `/attack-detection/brute-force/users/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          expect: "void",
        },
      )
    },
    async getUserGroups(userId: string) {
      const groupsCountPayload = await keycloakRequest<unknown>(
        config,
        `/users/${encodeURIComponent(userId)}/groups/count`,
      )
      const total = toNumberFromUnknown(groupsCountPayload)

      return listAllPages<KeycloakGroupRepresentation>(
        (first, max) =>
          keycloakRequest<KeycloakGroupRepresentation[]>(
            config,
            `/users/${encodeURIComponent(userId)}/groups`,
            {
              query: {
                first,
                max,
              },
            },
          ),
        100,
        total,
      )
    },
    async addUserToGroup(userId: string, groupId: string) {
      await keycloakRequest<void>(
        config,
        `/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`,
        {
          method: "PUT",
          expect: "void",
        },
      )
    },
    async removeUserFromGroup(userId: string, groupId: string) {
      await keycloakRequest<void>(
        config,
        `/users/${encodeURIComponent(userId)}/groups/${encodeURIComponent(groupId)}`,
        {
          method: "DELETE",
          expect: "void",
        },
      )
    },
    async getUserRoleMappings(userId: string) {
      return keycloakRequest<KeycloakMappingsRepresentation>(
        config,
        `/users/${encodeURIComponent(userId)}/role-mappings`,
      )
    },
    async getUserFederatedIdentities(userId: string) {
      return keycloakRequest<KeycloakFederatedIdentityRepresentation[]>(
        config,
        `/users/${encodeURIComponent(userId)}/federated-identity`,
      )
    },
    async getUserSessions(userId: string) {
      return keycloakRequest<KeycloakUserSessionRepresentation[]>(
        config,
        `/users/${encodeURIComponent(userId)}/sessions`,
      )
    },
    async getBruteForceStatus(userId: string) {
      return keycloakRequest<Record<string, unknown>>(
        config,
        `/attack-detection/brute-force/users/${encodeURIComponent(userId)}`,
      )
    },
    async getRealmEvents(filters?: {
      user?: string
      client?: string
      types?: string[]
      first?: number
      max?: number
      direction?: "asc" | "desc"
      dateFrom?: string | number
      dateTo?: string | number
    }) {
      return keycloakRequest<KeycloakEventRepresentation[]>(config, "/events", {
        query: {
          user: filters?.user,
          client: filters?.client,
          type: filters?.types,
          first: filters?.first,
          max: filters?.max,
          direction: filters?.direction,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
        },
      })
    },
    async getAdminEvents(filters?: {
      resourcePath?: string
      resourceTypes?: string[]
      operationTypes?: string[]
      first?: number
      max?: number
      direction?: "asc" | "desc"
      dateFrom?: string | number
      dateTo?: string | number
    }) {
      return keycloakRequest<KeycloakAdminEventRepresentation[]>(config, "/admin-events", {
        query: {
          resourcePath: filters?.resourcePath,
          resourceTypes: filters?.resourceTypes,
          operationTypes: filters?.operationTypes,
          first: filters?.first,
          max: filters?.max,
          direction: filters?.direction,
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo,
        },
      })
    },
    async countGroups(search?: string, top?: boolean) {
      const payload = await keycloakRequest<unknown>(config, "/groups/count", {
        query: {
          search,
          top,
        },
      })

      return toNumberFromUnknown(payload)
    },
    async getGroup(groupId: string) {
      return keycloakRequest<KeycloakGroupRepresentation>(
        config,
        `/groups/${encodeURIComponent(groupId)}`,
      )
    },
    async listGroups(options?: {
      search?: string
      first?: number
      max?: number
      briefRepresentation?: boolean
      exact?: boolean
      populateHierarchy?: boolean
      subGroupsCount?: boolean
    }) {
      return keycloakRequest<KeycloakGroupRepresentation[]>(config, "/groups", {
        query: {
          search: options?.search,
          first: options?.first,
          max: options?.max,
          exact: options?.exact,
          briefRepresentation: options?.briefRepresentation ?? false,
          populateHierarchy: options?.populateHierarchy ?? true,
          subGroupsCount: options?.subGroupsCount ?? true,
        },
      })
    },
    async listAllGroups() {
      const topLevelCount = await this.countGroups(undefined, true)
      const pages = await listAllPages<KeycloakGroupRepresentation>(
        (first, max) =>
          this.listGroups({
            first,
            max,
            briefRepresentation: false,
            populateHierarchy: true,
            subGroupsCount: true,
          }),
        100,
        topLevelCount || undefined,
      )

      return flattenGroupHierarchy(pages)
    },
    async createGroup(payload: Partial<KeycloakGroupRepresentation>) {
      const { response } = await keycloakRequestResponse<unknown>(config, "/groups", {
        method: "POST",
        body: payload,
      })
      const location = response.headers.get("location")
      const groupId = location?.split("/").filter(Boolean).pop() ?? null

      return {
        location,
        groupId,
      }
    },
    async updateGroup(groupId: string, payload: Partial<KeycloakGroupRepresentation>) {
      await keycloakRequest<void>(config, `/groups/${encodeURIComponent(groupId)}`, {
        method: "PUT",
        body: payload,
        expect: "void",
      })
    },
    async getGroupRoleMappings(groupId: string) {
      return keycloakRequest<KeycloakMappingsRepresentation>(
        config,
        `/groups/${encodeURIComponent(groupId)}/role-mappings`,
      )
    },
    async getGroupMembers(groupId: string) {
      return listAllPages<KeycloakUserRepresentation>(
        (first, max) =>
          keycloakRequest<KeycloakUserRepresentation[]>(
            config,
            `/groups/${encodeURIComponent(groupId)}/members`,
            {
              query: {
                first,
                max,
                briefRepresentation: false,
              },
            },
          ),
        100,
      )
    },
    async listClients(options?: {
      search?: string
      first?: number
      max?: number
    }) {
      return keycloakRequest<KeycloakClientRepresentation[]>(config, "/clients", {
        query: {
          search: options?.search,
          first: options?.first,
          max: options?.max,
        },
      })
    },
    async listAllClients() {
      return listAllPages<KeycloakClientRepresentation>(
        (first, max) =>
          this.listClients({
            first,
            max,
          }),
        100,
      )
    },
    async getClientSessionStats() {
      return keycloakRequest<Record<string, unknown>>(config, "/client-session-stats")
    },
    async getClientUserSessions(clientUuid: string, options?: { first?: number; max?: number }) {
      return keycloakRequest<KeycloakUserSessionRepresentation[]>(
        config,
        `/clients/${encodeURIComponent(clientUuid)}/user-sessions`,
        {
          query: {
            first: options?.first,
            max: options?.max,
          },
        },
      )
    },
  }
}

export function getPasswordCredential(credentials: KeycloakCredentialRepresentation[]) {
  return credentials
    .filter((credential) => credential.type === "password")
    .sort((left, right) => (right.createdDate ?? 0) - (left.createdDate ?? 0))[0] ?? null
}
