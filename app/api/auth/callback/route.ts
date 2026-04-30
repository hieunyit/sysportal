import { NextResponse } from "next/server"
import {
  buildAuthenticatedUser,
  exchangeAuthorizationCode,
  getKeycloakAuthConfig,
} from "@/lib/auth/keycloak-auth"
import { BOOTSTRAP_ADMIN_ROLE } from "@/lib/auth/access"
import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_STATE_COOKIE_NAME,
  createITOpsSessionToken,
  getCookieValue,
  getExpiredCookieOptions,
  getSessionCookieOptions,
  normalizeNextPath,
  verifyAuthStateToken,
} from "@/lib/auth/session"
import {
  authUserPermissions,
  countAuthUsers,
  getBootstrapAdminSubject,
  setBootstrapAdminSubject,
  updateAuthUserPermissions,
  upsertAuthenticatedUser,
} from "@/lib/settings-store"

export const runtime = "nodejs"

function buildLoginRedirect(requestUrl: URL, detail: string) {
  const loginUrl = new URL("/login", requestUrl.origin)
  loginUrl.searchParams.set("error", detail)
  return NextResponse.redirect(loginUrl)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")?.trim() ?? ""
  const state = requestUrl.searchParams.get("state")?.trim() ?? ""

  if (!code || !state) {
    return buildLoginRedirect(requestUrl, "Missing Keycloak callback parameters.")
  }

  const stateToken = getCookieValue(request.headers.get("cookie"), AUTH_STATE_COOKIE_NAME)
  const authState = await verifyAuthStateToken(stateToken)

  if (!authState || authState.state !== state) {
    const response = buildLoginRedirect(requestUrl, "The login attempt expired. Please try again.")
    response.cookies.set(AUTH_STATE_COOKIE_NAME, "", getExpiredCookieOptions())
    return response
  }

  try {
    const config = getKeycloakAuthConfig()
    const redirectUri = `${requestUrl.origin}/api/auth/callback`
    const tokens = await exchangeAuthorizationCode(config, { code, redirectUri })
    const authenticatedUser = buildAuthenticatedUser(tokens)

    const isFirstEver = countAuthUsers() === 0
    upsertAuthenticatedUser({
      subject: authenticatedUser.sub,
      preferredUsername: authenticatedUser.preferredUsername,
      fullName: authenticatedUser.name,
      email: authenticatedUser.email,
      roles: authenticatedUser.roles,
    })

    if (isFirstEver) {
      setBootstrapAdminSubject(authenticatedUser.sub)
      updateAuthUserPermissions(authenticatedUser.sub, [...authUserPermissions])
    }

    const bootstrapAdminSubject = getBootstrapAdminSubject()
    const sessionRoles =
      bootstrapAdminSubject === authenticatedUser.sub
        ? Array.from(new Set([...authenticatedUser.roles, BOOTSTRAP_ADMIN_ROLE]))
        : authenticatedUser.roles

    const sessionToken = await createITOpsSessionToken({
      ...authenticatedUser,
      roles: sessionRoles,
    })
    const response = NextResponse.redirect(
      new URL(normalizeNextPath(authState.nextPath), requestUrl.origin),
    )

    response.cookies.set(
      AUTH_SESSION_COOKIE_NAME,
      sessionToken,
      getSessionCookieOptions(),
    )
    response.cookies.set(AUTH_STATE_COOKIE_NAME, "", getExpiredCookieOptions())

    return response
  } catch (error) {
    const response = buildLoginRedirect(
      requestUrl,
      error instanceof Error ? error.message : "Unable to complete Keycloak login.",
    )
    response.cookies.set(AUTH_STATE_COOKIE_NAME, "", getExpiredCookieOptions())
    response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", getExpiredCookieOptions())
    return response
  }
}
