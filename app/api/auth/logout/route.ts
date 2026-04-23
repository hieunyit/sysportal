import { NextResponse } from "next/server"
import { buildKeycloakLogoutUrl, getKeycloakAuthConfig } from "@/lib/auth/keycloak-auth"
import {
  AUTH_SESSION_COOKIE_NAME,
  AUTH_STATE_COOKIE_NAME,
  getExpiredCookieOptions,
  getSessionFromRequest,
} from "@/lib/auth/session"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const session = await getSessionFromRequest(request)
  let redirectUrl = new URL("/login", requestUrl.origin).toString()

  try {
    const config = getKeycloakAuthConfig()
    redirectUrl = buildKeycloakLogoutUrl(config, {
      postLogoutRedirectUri: new URL("/login", requestUrl.origin).toString(),
      idTokenHint: session?.idToken,
    })
  } catch {
    // Fall back to the local login page when Keycloak auth config is unavailable.
  }

  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", getExpiredCookieOptions())
  response.cookies.set(AUTH_STATE_COOKIE_NAME, "", getExpiredCookieOptions())
  return response
}
