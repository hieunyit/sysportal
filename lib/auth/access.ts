import type { IdentityOpsSessionPayload } from "@/lib/auth/session"

const DEFAULT_ADMIN_ROLES = ["admin", "identity-admin", "Identity Administrator"]

function parseConfiguredRoles(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getConfiguredAdminRoles() {
  const configuredRoles = parseConfiguredRoles(process.env.IDENTITYOPS_ADMIN_ROLES)
  return configuredRoles.length > 0 ? configuredRoles : DEFAULT_ADMIN_ROLES
}

export function getActorName(session: IdentityOpsSessionPayload) {
  return (
    session.name?.trim() ||
    session.preferredUsername?.trim() ||
    session.email?.trim() ||
    session.sub
  )
}

export function hasAnyRole(session: IdentityOpsSessionPayload, roles: string[]) {
  const userRoles = new Set(session.roles.map((role) => role.trim()).filter(Boolean))
  return roles.some((role) => userRoles.has(role))
}
