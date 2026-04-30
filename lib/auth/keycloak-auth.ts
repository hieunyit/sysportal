import { request as httpRequest } from "node:http"
import { request as httpsRequest } from "node:https"
import { getErrorDetail } from "@/lib/error-utils"
import {
  getSystemConnection,
  type KeycloakConnectionRecord,
} from "@/lib/settings-store"
import { parseJwtPayload } from "@/lib/auth/session"

interface KeycloakTokenResponse {
  access_token: string
  expires_in: number
  refresh_expires_in?: number
  refresh_token?: string
  token_type: string
  id_token?: string
  scope?: string
}

interface OidcHttpResponse<T = unknown> {
  statusCode: number
  text: string
  json: T | null
}

interface KeycloakTokenClaims {
  sub?: string
  email?: string
  name?: string
  preferred_username?: string
  realm_access?: {
    roles?: string[]
  }
  resource_access?: Record<
    string,
    {
      roles?: string[]
    }
  >
}

export interface KeycloakAuthenticatedUser {
  sub: string
  email: string
  name: string
  preferredUsername: string
  roles: string[]
  idToken?: string
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function describeNetworkError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown connection error"
  }

  const code =
    typeof (error as NodeJS.ErrnoException).code === "string"
      ? (error as NodeJS.ErrnoException).code
      : null

  return code ? `${code}: ${error.message}` : error.message
}

function requestOidcJson<T = unknown>(
  config: ReturnType<typeof getKeycloakAuthConfig>,
  url: string,
  {
    method = "POST",
    body,
    headers,
  }: {
    method?: "POST" | "GET"
    body?: string
    headers?: Record<string, string>
  } = {},
) {
  return new Promise<OidcHttpResponse<T>>((resolve, reject) => {
    const target = new URL(url)
    const isHttps = target.protocol === "https:"
    const requestImpl = isHttps ? httpsRequest : httpRequest
    const requestHeaders = {
      Accept: "application/json",
      ...(headers ?? {}),
    } as Record<string, string>

    if (body !== undefined && !requestHeaders["Content-Length"]) {
      requestHeaders["Content-Length"] = String(Buffer.byteLength(body))
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
            text,
            json,
          })
        })
      },
    )

    request.setTimeout(Math.max(config.timeoutSeconds, 1) * 1000, () => {
      request.destroy(
        new Error(`Request timed out after ${Math.max(config.timeoutSeconds, 1) * 1000}ms`),
      )
    })
    request.on("error", reject)

    if (body !== undefined) {
      request.write(body)
    }

    request.end()
  })
}

export function getKeycloakAuthConfig() {
  const config = getSystemConnection("keycloak").config as KeycloakConnectionRecord

  if (!config.serverUrl.trim() || !config.realm.trim() || !config.clientId.trim()) {
    throw new Error("Keycloak authentication is not configured. Review the Keycloak connection settings.")
  }

  return {
    serverUrl: trimTrailingSlash(config.serverUrl.trim()),
    realm: config.realm.trim(),
    clientId: config.clientId.trim(),
    clientSecret: config.clientSecret.trim(),
    verifyTls: config.verifyTls,
    timeoutSeconds: config.timeoutSeconds,
  }
}

function getOidcBaseUrl(config: ReturnType<typeof getKeycloakAuthConfig>) {
  return `${config.serverUrl}/realms/${encodeURIComponent(config.realm)}/protocol/openid-connect`
}

export function buildKeycloakAuthorizeUrl(
  config: ReturnType<typeof getKeycloakAuthConfig>,
  {
    redirectUri,
    state,
  }: {
    redirectUri: string
    state: string
  },
) {
  const url = new URL(`${getOidcBaseUrl(config)}/auth`)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid profile email")
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("state", state)
  return url.toString()
}

export function buildKeycloakLogoutUrl(
  config: ReturnType<typeof getKeycloakAuthConfig>,
  {
    postLogoutRedirectUri,
    idTokenHint,
  }: {
    postLogoutRedirectUri: string
    idTokenHint?: string
  },
) {
  const url = new URL(`${getOidcBaseUrl(config)}/logout`)
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri)

  if (idTokenHint?.trim()) {
    url.searchParams.set("id_token_hint", idTokenHint.trim())
  }

  return url.toString()
}

export async function exchangeAuthorizationCode(
  config: ReturnType<typeof getKeycloakAuthConfig>,
  {
    code,
    redirectUri,
  }: {
    code: string
    redirectUri: string
  },
) {
  const tokenUrl = `${getOidcBaseUrl(config)}/token`
  const tokenBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  }).toString()
  let response: OidcHttpResponse<Record<string, unknown>>

  try {
    response = await requestOidcJson<Record<string, unknown>>(config, tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody,
    })
  } catch (error) {
    throw new Error(`Keycloak token exchange request failed: ${describeNetworkError(error)}`)
  }

  const payload = response.json ?? null

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      payload?.error_description?.toString().trim() ||
        payload?.error?.toString().trim() ||
        (response.text.trim() ? response.text.trim() : "") ||
        getErrorDetail(payload, "Keycloak token exchange failed"),
    )
  }

  return payload as unknown as KeycloakTokenResponse
}

export function buildAuthenticatedUser(tokens: KeycloakTokenResponse): KeycloakAuthenticatedUser {
  const idTokenClaims = parseJwtPayload<KeycloakTokenClaims>(tokens.id_token) ?? {}
  const accessTokenClaims = parseJwtPayload<KeycloakTokenClaims>(tokens.access_token) ?? {}

  const realmRoles = [
    ...(idTokenClaims.realm_access?.roles ?? []),
    ...(accessTokenClaims.realm_access?.roles ?? []),
  ]

  const clientRoles = Object.entries({
    ...(idTokenClaims.resource_access ?? {}),
    ...(accessTokenClaims.resource_access ?? {}),
  }).flatMap(([clientName, value]) =>
    (value.roles ?? []).flatMap((role) => [role, `${clientName}:${role}`]),
  )

  const resolvedRoles = Array.from(
    new Set(
      [...realmRoles, ...clientRoles]
        .map((role) => role.trim())
        .filter(Boolean),
    ),
  )

  const resolvedClaims = {
    ...accessTokenClaims,
    ...idTokenClaims,
    realm_access: {
      roles: resolvedRoles,
    },
  }

  return {
    sub:
      resolvedClaims.sub?.trim() ||
      resolvedClaims.preferred_username?.trim() ||
      resolvedClaims.email?.trim() ||
      "identityops-user",
    email: resolvedClaims.email?.trim() || "",
    name:
      resolvedClaims.name?.trim() ||
      resolvedClaims.preferred_username?.trim() ||
      resolvedClaims.email?.trim() ||
      "IdentityOps User",
    preferredUsername:
      resolvedClaims.preferred_username?.trim() ||
      resolvedClaims.email?.trim() ||
      resolvedClaims.sub?.trim() ||
      "identityops-user",
    roles: resolvedRoles,
    idToken: tokens.id_token?.trim() || undefined,
  }
}
