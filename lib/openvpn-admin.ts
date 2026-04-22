import { request as httpRequest, type IncomingHttpHeaders } from "node:http"
import { request as httpsRequest } from "node:https"
import { getSystemConnection, type OpenVpnConnectionRecord } from "@/lib/settings-store"

type OpenVpnRequestMethod = "GET" | "POST"

interface OpenVpnTokenResponse {
  auth_token?: string
  expires_after?: string
  renewable_until?: string
  username?: string
  reason?: string
}

interface OpenVpnHttpResponse<T = unknown> {
  statusCode: number
  headers: IncomingHttpHeaders
  text: string
  json: T | null
}

interface OpenVpnRequestOptions {
  method?: OpenVpnRequestMethod
  body?: unknown
}

interface OpenVpnTokenCacheEntry {
  token: string
  expiresAt: number
}

export interface OpenVpnFilterString {
  operation: "equal" | "not_equal" | "substring"
  value: string
}

export interface OpenVpnFilterBool {
  value: boolean
}

export interface OpenVpnUserPropValue {
  value?: string | boolean | null
  inherited?: boolean
  inherited_source_type?: "default" | "implicit_default" | "group" | "configuration"
  inherited_source_name?: string
}

export interface OpenVpnIpSubnet {
  ipv6?: boolean
  netip: string
  prefix_length: number
}

export interface OpenVpnPortRangeService {
  protocol: "tcp" | "udp"
  start_port: number
  end_port?: number
}

export interface OpenVpnIcmpService {
  protocol: "icmp"
  type: string
}

export type OpenVpnIpService = OpenVpnPortRangeService | OpenVpnIcmpService

export interface OpenVpnAccessRouteSubnet extends OpenVpnIpSubnet {
  service?: OpenVpnIpService[]
}

export interface OpenVpnDmzIp {
  ip: string
  protocol?: "tcp" | "udp" | "icmp"
  start_port?: number
  end_port?: number
}

export interface OpenVpnGroupIpRange {
  ipv6?: boolean
  first_ip: string
  last_ip: string
}

export interface OpenVpnUserPropBase {
  name: string
  deny?: OpenVpnUserPropValue | null
  deny_web?: OpenVpnUserPropValue | null
  admin?: OpenVpnUserPropValue | null
  autologin?: OpenVpnUserPropValue | null
  auth_method?: OpenVpnUserPropValue | null
  cc_commands?: OpenVpnUserPropValue | null
  totp?: OpenVpnUserPropValue | null
  password_strength?: OpenVpnUserPropValue | null
  allow_password_change?: OpenVpnUserPropValue | null
  reroute_gw?: OpenVpnUserPropValue | null
  allow_generate_profiles?: OpenVpnUserPropValue | null
  bypass_subnets?: OpenVpnIpSubnet[]
}

export interface OpenVpnUserProfile extends OpenVpnUserPropBase {
  password_defined?: boolean
  mfa_status?: "pending" | "disabled" | "enrolled"
  totp_locked?: boolean
  group?: string
  static_ipv4?: string
  static_ipv6?: string
  dmz_ip?: OpenVpnDmzIp[]
  dmz_ipv6?: OpenVpnDmzIp[]
  compile?: boolean
  totp_secret?: string
  totp_admin_only?: boolean
  client_to_server_subnets?: OpenVpnIpSubnet[]
}

export interface OpenVpnGroupProfile extends OpenVpnUserPropBase {
  members?: string[]
  member_count?: number
  subnets?: OpenVpnIpSubnet[]
  dynamic_ranges?: OpenVpnGroupIpRange[]
}

export type OpenVpnProfile = OpenVpnUserProfile | OpenVpnGroupProfile

export interface OpenVpnUserSetPayload {
  name: string
  deny?: boolean | null
  deny_web?: boolean | null
  admin?: boolean | null
  autologin?: boolean | null
  auth_method?: string | null
  cc_commands?: string | null
  totp?: boolean | null
  password_strength?: boolean | null
  allow_password_change?: boolean | null
  reroute_gw?: string | null
  allow_generate_profiles?: boolean | null
  bypass_subnets?: OpenVpnIpSubnet[] | null
  group?: string | null
  static_ipv4?: string | null
  static_ipv6?: string | null
  dmz_ip?: OpenVpnDmzIp[] | null
  dmz_ipv6?: OpenVpnDmzIp[] | null
  compile?: boolean | null
  totp_admin_only?: boolean | null
  client_to_server_subnets?: OpenVpnIpSubnet[] | null
}

export interface OpenVpnGroupSetPayload {
  name: string
  deny?: boolean | null
  deny_web?: boolean | null
  admin?: boolean | null
  autologin?: boolean | null
  auth_method?: string | null
  cc_commands?: string | null
  totp?: boolean | null
  password_strength?: boolean | null
  allow_password_change?: boolean | null
  reroute_gw?: string | null
  allow_generate_profiles?: boolean | null
  bypass_subnets?: OpenVpnIpSubnet[] | null
  members?: string[] | null
  subnets?: OpenVpnIpSubnet[] | null
  dynamic_ranges?: OpenVpnGroupIpRange[] | null
}

export type OpenVpnAccessListType =
  | "access_from_ipv6"
  | "access_from_ipv4"
  | "access_to_ipv4"
  | "access_to_ipv6"

export interface OpenVpnAccessRoute {
  type: "user" | "group" | "route" | "nat" | "all" | "all_vpn_clients" | "all_s2c_subnets"
  accept?: boolean
  username?: string
  groupname?: string
  subnet?: OpenVpnAccessRouteSubnet
}

export interface OpenVpnAccessListItem {
  username?: string
  groupname?: string
  access_route: OpenVpnAccessRoute | null
  type: OpenVpnAccessListType
}

export interface OpenVpnAccessRuleset {
  owner?: string
  owner_type?: string
  id: number
  name: string
  position?: number
  comment?: string
}

export interface OpenVpnAccessRule {
  id?: number
  ruleset_id: number
  type: "domain_routing" | "filter"
  match_type:
    | "domain"
    | "not_domain"
    | "subdomain"
    | "not_subdomain"
    | "domain_or_subdomain"
    | "not_domain_or_subdomain"
  match_data: string
  action: "route" | "nat" | "deny" | "bypass"
  position: number
  comment: string
}

export class OpenVpnApiError extends Error {
  status: number
  detail: string
  payload: unknown

  constructor(message: string, status: number, detail: string, payload: unknown) {
    super(message)
    this.name = "OpenVpnApiError"
    this.status = status
    this.detail = detail
    this.payload = payload
  }
}

declare global {
  var __identityOpsOpenVpnTokenCache__: Map<string, OpenVpnTokenCacheEntry> | undefined
}

function getConfig() {
  return getSystemConnection("openvpn").config as OpenVpnConnectionRecord
}

function getTokenCache() {
  if (!globalThis.__identityOpsOpenVpnTokenCache__) {
    globalThis.__identityOpsOpenVpnTokenCache__ = new Map()
  }

  return globalThis.__identityOpsOpenVpnTokenCache__
}

function buildCacheKey(config: OpenVpnConnectionRecord) {
  return [
    trimTrailingSlash(config.serverUrl),
    normalizeApiBasePath(config.apiBasePath),
    config.username.trim(),
    config.nodeName.trim(),
  ].join("::")
}

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function normalizeApiBasePath(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return "/api"
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return normalized.replace(/\/+$/, "") || "/api"
}

function getBaseUrl(config: OpenVpnConnectionRecord) {
  return `${trimTrailingSlash(config.serverUrl)}${normalizeApiBasePath(config.apiBasePath)}`
}

function summarizePayload(value: unknown) {
  if (typeof value === "string") {
    return value.trim()
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const preferredKeys = ["detail", "reason", "error", "message", "username"]

  for (const key of preferredKeys) {
    const match = entries.find(([entryKey, entryValue]) => entryKey === key && typeof entryValue === "string")

    if (match) {
      return String(match[1]).trim()
    }
  }

  return entries
    .filter(([, entryValue]) => ["string", "number", "boolean"].includes(typeof entryValue))
    .slice(0, 3)
    .map(([key, entryValue]) => `${key}=${String(entryValue)}`)
    .join(", ")
}

function requestJson<T = unknown>(
  config: OpenVpnConnectionRecord,
  url: string,
  {
    method = "POST",
    body,
    headers,
  }: {
    method?: OpenVpnRequestMethod
    body?: unknown
    headers?: Record<string, string>
  } = {},
) {
  return new Promise<OpenVpnHttpResponse<T>>((resolve, reject) => {
    const target = new URL(url)
    const isHttps = target.protocol === "https:"
    const requestImpl = isHttps ? httpsRequest : httpRequest
    const requestBody = body === undefined ? undefined : JSON.stringify(body)
    const requestHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(requestBody !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(headers ?? {}),
    }

    if (requestBody !== undefined) {
      requestHeaders["Content-Length"] = String(Buffer.byteLength(requestBody))
    }

    const request = requestImpl(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port ? Number(target.port) : undefined,
        path: `${target.pathname}${target.search}`,
        method,
        headers: requestHeaders,
        rejectUnauthorized: config.verifyTls,
      },
      (response) => {
        const chunks: Buffer[] = []

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          let json: T | null = null

          if (text) {
            try {
              json = JSON.parse(text) as T
            } catch {
              json = null
            }
          }

          resolve({
            statusCode: response.statusCode ?? 0,
            headers: response.headers,
            text,
            json,
          })
        })
      },
    )

    request.setTimeout(config.timeoutSeconds * 1000, () => {
      request.destroy(new Error(`Request timed out after ${config.timeoutSeconds}s`))
    })
    request.on("error", reject)

    if (requestBody !== undefined) {
      request.write(requestBody)
    }

    request.end()
  })
}

function extractExpiresAt(payload: OpenVpnTokenResponse) {
  const candidates = [payload.expires_after, payload.renewable_until]

  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    const parsed = Date.parse(candidate)

    if (!Number.isNaN(parsed)) {
      return parsed - 15_000
    }

    const numeric = Number(candidate)

    if (!Number.isNaN(numeric) && numeric > 0) {
      return Date.now() + numeric * 1000 - 15_000
    }
  }

  return Date.now() + 4 * 60 * 1000
}

async function requestAdminToken(config: OpenVpnConnectionRecord) {
  if (!config.username.trim() || !config.password.trim()) {
    throw new Error("OpenVPN connection is incomplete. Username and password are required.")
  }

  const response = await requestJson<OpenVpnTokenResponse>(
    config,
    `${getBaseUrl(config)}/auth/login/userpassword`,
    {
      method: "POST",
      body: {
        username: config.username.trim(),
        password: config.password,
        request_admin: true,
      },
      headers: config.nodeName.trim()
        ? {
            "X-OpenVPN-AS-Node": config.nodeName.trim(),
          }
        : undefined,
    },
  )

  if (response.statusCode < 200 || response.statusCode >= 300 || !response.json?.auth_token) {
    throw new OpenVpnApiError(
      "Unable to obtain an OpenVPN admin auth token.",
      response.statusCode,
      summarizePayload(response.json ?? response.text) || "OpenVPN admin login failed.",
      response.json ?? response.text,
    )
  }

  return {
    token: response.json.auth_token,
    expiresAt: extractExpiresAt(response.json),
  }
}

async function getAdminToken(config: OpenVpnConnectionRecord) {
  const cache = getTokenCache()
  const key = buildCacheKey(config)
  const cached = cache.get(key)

  if (cached && cached.expiresAt > Date.now()) {
    return cached.token
  }

  const entry = await requestAdminToken(config)
  cache.set(key, entry)
  return entry.token
}

async function openVpnRequest<T = unknown>(
  config: OpenVpnConnectionRecord,
  path: string,
  options: OpenVpnRequestOptions = {},
) {
  const token = await getAdminToken(config)
  const response = await requestJson<T>(config, `${getBaseUrl(config)}${path}`, {
    method: options.method ?? "POST",
    body: options.body,
    headers: {
      "X-OpenVPN-As-AuthToken": token,
      ...(config.nodeName.trim()
        ? {
            "X-OpenVPN-AS-Node": config.nodeName.trim(),
          }
        : {}),
    },
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new OpenVpnApiError(
      `OpenVPN request failed for ${path}.`,
      response.statusCode,
      summarizePayload(response.json ?? response.text) || "OpenVPN Access Server rejected the request.",
      response.json ?? response.text,
    )
  }

  return response.json as T
}

export async function createOpenVpnAdminClient(configInput?: OpenVpnConnectionRecord) {
  const config = configInput ?? getConfig()

  async function listAllUsers(input?: {
    search?: string
    users?: string[]
    proplist?: string[] | null
  }) {
    const pageSize = 200
    const items: OpenVpnUserProfile[] = []
    let offset = 0

    while (true) {
      const page = await openVpnRequest<{ total?: number; profiles?: OpenVpnUserProfile[] }>(config, "/users/list", {
        body: {
          page_size: pageSize,
          offset,
          ...(input?.search
            ? {
                filters: {
                  name: {
                    operation: "substring",
                    value: input.search,
                  },
                },
              }
            : {}),
          ...(input?.users?.length ? { users: input.users } : {}),
          ...(input?.proplist !== undefined ? { proplist: input.proplist } : {}),
        },
      })

      const profiles = page.profiles ?? []
      items.push(...profiles)

      if (profiles.length < pageSize || (typeof page.total === "number" && items.length >= page.total)) {
        break
      }

      offset += pageSize
    }

    return items
  }

  async function listAllGroups(input?: {
    search?: string
    groups?: string[]
    enumerateMembers?: boolean
    proplist?: string[] | null
  }) {
    const pageSize = 200
    const items: OpenVpnGroupProfile[] = []
    let offset = 0

    while (true) {
      const page = await openVpnRequest<{ total?: number; profiles?: OpenVpnGroupProfile[] }>(config, "/groups/list", {
        body: {
          page_size: pageSize,
          offset,
          enumerate_members: input?.enumerateMembers,
          ...(input?.search
            ? {
                filters: {
                  name: {
                    operation: "substring",
                    value: input.search,
                  },
                },
              }
            : {}),
          ...(input?.groups?.length ? { groups: input.groups } : {}),
          ...(input?.proplist !== undefined ? { proplist: input.proplist } : {}),
        },
      })

      const profiles = page.profiles ?? []
      items.push(...profiles)

      if (profiles.length < pageSize || (typeof page.total === "number" && items.length >= page.total)) {
        break
      }

      offset += pageSize
    }

    return items
  }

  return {
    async listUsers(input?: {
      pageSize?: number
      offset?: number
      search?: string
      users?: string[]
      proplist?: string[] | null
    }) {
      return openVpnRequest<{ total?: number; profiles?: OpenVpnUserProfile[] }>(config, "/users/list", {
        body: {
          page_size: input?.pageSize,
          offset: input?.offset,
          ...(input?.search
            ? {
                filters: {
                  name: {
                    operation: "substring",
                    value: input.search,
                  },
                },
              }
            : {}),
          ...(input?.users?.length ? { users: input.users } : {}),
          ...(input?.proplist !== undefined ? { proplist: input.proplist } : {}),
        },
      })
    },

    async createUser(payload: OpenVpnUserSetPayload) {
      return openVpnRequest<void>(config, "/users/create", {
        body: payload,
      })
    },

    async listAllUsers(input?: {
      search?: string
      users?: string[]
      proplist?: string[] | null
    }) {
      return listAllUsers(input)
    },

    async getUser(name: string) {
      const items = await listAllUsers({
        users: [name],
      })
      return items.find((item) => item.name === name) ?? null
    },

    async listGroups(input?: {
      pageSize?: number
      offset?: number
      search?: string
      groups?: string[]
      enumerateMembers?: boolean
      proplist?: string[] | null
    }) {
      return openVpnRequest<{ total?: number; profiles?: OpenVpnGroupProfile[] }>(config, "/groups/list", {
        body: {
          page_size: input?.pageSize,
          offset: input?.offset,
          enumerate_members: input?.enumerateMembers,
          ...(input?.search
            ? {
                filters: {
                  name: {
                    operation: "substring",
                    value: input.search,
                  },
                },
              }
            : {}),
          ...(input?.groups?.length ? { groups: input.groups } : {}),
          ...(input?.proplist !== undefined ? { proplist: input.proplist } : {}),
        },
      })
    },

    async createGroup(payload: OpenVpnGroupSetPayload) {
      return openVpnRequest<void>(config, "/groups/create", {
        body: payload,
      })
    },

    async listAllGroups(input?: {
      search?: string
      groups?: string[]
      enumerateMembers?: boolean
      proplist?: string[] | null
    }) {
      return listAllGroups(input)
    },

    async getGroup(name: string, options?: { enumerateMembers?: boolean }) {
      const items = await listAllGroups({
        groups: [name],
        enumerateMembers: options?.enumerateMembers,
      })
      return items.find((item) => item.name === name) ?? null
    },

    async setUserProps(
      payload: Array<OpenVpnUserSetPayload | OpenVpnGroupSetPayload | Record<string, unknown>>,
    ) {
      return openVpnRequest<void>(config, "/userprop/set", {
        body: payload,
      })
    },

    async listAccessLists(input: {
      users?: string[]
      groups?: string[]
      filters?: {
        username?: OpenVpnFilterString
        groupname?: OpenVpnFilterString
        object_type?: "user" | "group" | "all"
      }
    }) {
      return openVpnRequest<{ profiles?: OpenVpnAccessListItem[] }>(config, "/userprop/access/list", {
        body: input,
      })
    },

    async setAccessLists(input: {
      items_set?: OpenVpnAccessListItem[]
      items_remove?: OpenVpnAccessListItem[]
      items_append?: OpenVpnAccessListItem[]
    }) {
      return openVpnRequest<void>(config, "/userprop/access/set", {
        body: input,
      })
    },

    async listRulesets(input: { owner: string; nameFilter?: string }) {
      return openVpnRequest<{ rulesets?: OpenVpnAccessRuleset[] }>(config, "/access/rulesets/list", {
        body: {
          owner: input.owner,
          ...(input.nameFilter
            ? {
                filters: {
                  name: {
                    operation: "substring",
                    value: input.nameFilter,
                  },
                },
              }
            : {}),
        },
      })
    },

    async addRuleset(payload: { name: string; comment: string }) {
      return openVpnRequest<{ id: number }>(config, "/access/rulesets/add", {
        body: payload,
      })
    },

    async updateRuleset(payload: { id: number; name: string; comment: string }) {
      return openVpnRequest<void>(config, "/access/rulesets/update", {
        body: payload,
      })
    },

    async deleteRulesets(ids: number[]) {
      return openVpnRequest<void>(config, "/access/rulesets/delete", {
        body: { ids },
      })
    },

    async modifySubjectRulesets(input: {
      add?: Record<string, Array<{ ruleset_id: number; position: number }>>
      delete?: Record<string, { ruleset_ids: number[] }>
    }) {
      return openVpnRequest<void>(config, "/access/user-rulesets/modify", {
        body: input,
      })
    },

    async listRules(input: {
      rulesetIds: number[]
      filters?: {
        type?: { operation: "equal" | "not_equal"; value: "domain_routing" | "filter" }
        match_type?: {
          operation: "equal" | "not_equal"
          value: OpenVpnAccessRule["match_type"]
        }
        match_data?: OpenVpnFilterString
      }
    }) {
      return openVpnRequest<{ rules?: OpenVpnAccessRule[] }>(config, "/access/rules/list", {
        body: {
          ruleset_ids: input.rulesetIds,
          ...(input.filters ? { filters: input.filters } : {}),
        },
      })
    },

    async modifyRules(input: {
      add?: OpenVpnAccessRule[]
      delete?: number[]
    }) {
      return openVpnRequest<{ added?: number[] }>(config, "/access/rules/modify", {
        body: input,
      })
    },
  }
}
