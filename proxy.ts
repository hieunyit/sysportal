import { NextResponse, type NextRequest } from "next/server"
import {
  AUTH_SESSION_COOKIE_NAME,
  verifyIdentityOpsSessionToken,
} from "@/lib/auth/session"
import { getConfiguredAdminRoles } from "@/lib/auth/access"

const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth"]
const ADMIN_PATH_PREFIXES = [
  "/analytics",
  "/connections",
  "/content-generator",
  "/groups",
  "/openvpn",
  "/sessions",
  "/settings",
  "/templates",
  "/users",
  "/api/audit",
  "/api/connections",
  "/api/email-templates",
  "/api/keycloak",
  "/api/openvpn",
  "/api/search",
  "/api/settings",
]

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isAdminPath(pathname: string) {
  return ADMIN_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function hasAdminRole(roles: string[]) {
  const configuredRoles = getConfiguredAdminRoles().map((role) => role.trim()).filter(Boolean)

  if (configuredRoles.some((role) => role === "*")) {
    return true
  }

  const userRoles = new Set(
    roles
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean),
  )

  return configuredRoles.some((role) => userRoles.has(role.toLowerCase()))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const cookieToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null
  const session = await verifyIdentityOpsSessionToken(cookieToken)

  if (session && (!isAdminPath(pathname) || hasAdminRole(session.roles))) {
    return NextResponse.next()
  }

  if (session && isAdminPath(pathname)) {
    if (pathname.startsWith("/api/")) {
      const configuredRoles = getConfiguredAdminRoles().map((role) => role.trim()).filter(Boolean)

      return NextResponse.json(
        {
          error: "Insufficient permissions",
          detail: "Your account does not have permission to access this admin API.",
          ...(process.env.NODE_ENV !== "production"
            ? {
                debug: {
                  requiredRoles: configuredRoles,
                  sessionRoles: session.roles,
                },
              }
            : {}),
        },
        { status: 403 },
      )
    }

    return NextResponse.redirect(new URL("/", request.url))
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        error: "Authentication required",
        detail: "Sign in with Keycloak before calling this API.",
      },
      { status: 401 },
    )
  }

  const loginUrl = new URL("/login", request.url)
  loginUrl.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
}
