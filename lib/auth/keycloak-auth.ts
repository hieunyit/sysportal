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

interface KeycloakTokenClaims {
  sub?: string
  email?: string
  name?: string
  preferred_username?: string
  realm_access?: {
    roles?: string[]
  }
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
  const response = await fetch(`${getOidcBaseUrl(config)}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  })

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null

  if (!response.ok) {
    throw new Error(
      payload?.error_description?.toString().trim() ||
        payload?.error?.toString().trim() ||
        getErrorDetail(payload, "Keycloak token exchange failed"),
    )
  }

  return payload as unknown as KeycloakTokenResponse
}

export function buildAuthenticatedUser(tokens: KeycloakTokenResponse): KeycloakAuthenticatedUser {
  const claims =
    parseJwtPayload<KeycloakTokenClaims>(tokens.id_token) ??
    parseJwtPayload<KeycloakTokenClaims>(tokens.access_token) ??
    {}

  return {
    sub: claims.sub?.trim() || claims.preferred_username?.trim() || claims.email?.trim() || "identityops-user",
    email: claims.email?.trim() || "",
    name:
      claims.name?.trim() ||
      claims.preferred_username?.trim() ||
      claims.email?.trim() ||
      "IdentityOps User",
    preferredUsername:
      claims.preferred_username?.trim() ||
      claims.email?.trim() ||
      claims.sub?.trim() ||
      "identityops-user",
    roles: claims.realm_access?.roles?.filter(Boolean) ?? [],
    idToken: tokens.id_token?.trim() || undefined,
  }
}
