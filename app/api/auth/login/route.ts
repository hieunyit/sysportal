import { NextResponse } from "next/server"
import { buildKeycloakAuthorizeUrl, getKeycloakAuthConfig } from "@/lib/auth/keycloak-auth"
import {
  AUTH_STATE_COOKIE_NAME,
  AUTH_STATE_DURATION_SECONDS,
  createAuthStateToken,
  getSessionCookieOptions,
  normalizeNextPath,
} from "@/lib/auth/session"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"))
  const state = crypto.randomUUID()
  const redirectUri = `${requestUrl.origin}/api/auth/callback`
  const config = getKeycloakAuthConfig()
  const authorizeUrl = buildKeycloakAuthorizeUrl(config, {
    redirectUri,
    state,
  })

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set(
    AUTH_STATE_COOKIE_NAME,
    await createAuthStateToken(state, nextPath),
    getSessionCookieOptions(AUTH_STATE_DURATION_SECONDS),
  )

  return response
}
