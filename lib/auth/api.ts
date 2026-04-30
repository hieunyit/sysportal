import { apiProblemResponse } from "@/lib/api-response"
import {
  getActorName,
  getConfiguredAdminRoles,
  hasAnyRole,
} from "@/lib/auth/access"
import {
  getSessionFromRequest,
  type IdentityOpsSessionPayload,
} from "@/lib/auth/session"
import { getAuthUserBySubject, type AuthUserPermission } from "@/lib/settings-store"

export interface ApiAuthResult {
  session: IdentityOpsSessionPayload
  actorName: string
}

export async function requireApiSession(
  request: Request,
  options: {
    roles?: string[]
  } = {},
): Promise<ApiAuthResult | Response> {
  const session = await getSessionFromRequest(request)

  if (!session) {
    return apiProblemResponse({
      status: 401,
      error: "Authentication required",
      detail: "Sign in with Keycloak before calling this API.",
      source: "app",
    })
  }

  const roles = options.roles?.filter(Boolean) ?? []

  if (roles.length > 0 && !hasAnyRole(session, roles)) {
    return apiProblemResponse({
      status: 403,
      error: "Insufficient permissions",
      detail: "Your account does not have permission to perform this action.",
      source: "app",
      extra:
        process.env.NODE_ENV !== "production"
          ? {
              debug: {
                requiredRoles: roles,
                sessionRoles: session.roles,
              },
            }
          : undefined,
    })
  }

  return {
    session,
    actorName: getActorName(session),
  }
}

export function isApiAuthResponse(value: ApiAuthResult | Response): value is Response {
  return value instanceof Response
}

function inferRequiredPermission(method: string): AuthUserPermission {
  if (method === "DELETE") return "delete"
  if (method === "GET" || method === "HEAD") return "view"
  return "edit"
}

export async function requireAdminApiSession(request: Request) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    return apiProblemResponse({
      status: 401,
      error: "Authentication required",
      detail: "Sign in with Keycloak before calling this API.",
      source: "app",
    })
  }

  const adminRoles = getConfiguredAdminRoles()

  if (adminRoles.length > 0 && hasAnyRole(session, adminRoles)) {
    return { session, actorName: getActorName(session) }
  }

  // Non-admin: check DB-stored permissions
  const required = inferRequiredPermission(request.method)

  let dbUser: Awaited<ReturnType<typeof getAuthUserBySubject>> | null = null
  try {
    dbUser = getAuthUserBySubject(session.sub)
  } catch {
    // DB unavailable — fall through to deny
  }

  if (!dbUser?.permissions.includes(required)) {
    return apiProblemResponse({
      status: 403,
      error: "Insufficient permissions",
      detail: `Your account does not have '${required}' permission to perform this action.`,
      source: "app",
    })
  }

  return { session, actorName: getActorName(session) }
}
