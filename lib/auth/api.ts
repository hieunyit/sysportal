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

export async function requireAdminApiSession(request: Request) {
  return requireApiSession(request, {
    roles: getConfiguredAdminRoles(),
  })
}
