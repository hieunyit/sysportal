import { NextResponse, type NextRequest } from "next/server"
import {
  AUTH_SESSION_COOKIE_NAME,
  verifyIdentityOpsSessionToken,
} from "@/lib/auth/session"

const PUBLIC_PATH_PREFIXES = ["/login", "/api/auth"]

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  const cookieToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value ?? null
  const session = await verifyIdentityOpsSessionToken(cookieToken)

  if (session) {
    return NextResponse.next()
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
