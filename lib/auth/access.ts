import type { ITOpsSessionPayload } from "@/lib/auth/session"

export const BOOTSTRAP_ADMIN_ROLE = "itops-bootstrap-admin"

const DEFAULT_ADMIN_ROLES = process.env.NODE_ENV === "production"
  ? ["admin", "identity-admin", "Identity Administrator", "realm-admin", BOOTSTRAP_ADMIN_ROLE]
  : ["*", BOOTSTRAP_ADMIN_ROLE]

function parseConfiguredRoles(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export function getConfiguredAdminRoles() {
  const configuredRoles = parseConfiguredRoles(process.env.ITOPS_ADMIN_ROLES)
  return configuredRoles.length > 0 ? configuredRoles : DEFAULT_ADMIN_ROLES
}

export function getActorName(session: ITOpsSessionPayload) {
  return (
    session.name?.trim() ||
    session.preferredUsername?.trim() ||
    session.email?.trim() ||
    session.sub
  )
}

export function hasAnyRole(session: ITOpsSessionPayload, roles: string[]) {
  if (roles.some((role) => role.trim() === "*")) {
    return true
  }

  const userRoles = new Set(
    session.roles
      .map((role) => role.trim().toLowerCase())
      .filter(Boolean),
  )
  return roles.some((role) => userRoles.has(role.trim().toLowerCase()))
}
