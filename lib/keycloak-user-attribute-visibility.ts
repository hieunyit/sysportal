import type { KeycloakUserProfileMetadata } from "@/lib/keycloak-admin"

const hiddenUserAttributeNames = new Set([
  "LDAP_ENTRY_DN",
  "LDAP_ID",
  "modifyTimestamp",
  "createTimestamp",
])

export function isHiddenUserAttributeName(name: string | null | undefined) {
  if (!name) {
    return false
  }

  return hiddenUserAttributeNames.has(name.trim())
}

export function filterHiddenUserAttributes(
  attributes: Record<string, string[]> | null | undefined,
) {
  if (!attributes) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(attributes).filter(([name]) => !isHiddenUserAttributeName(name)),
  )
}

export function filterHiddenUserProfileMetadata(
  profileMetadata: KeycloakUserProfileMetadata | Record<string, unknown> | null | undefined,
) {
  if (!profileMetadata || typeof profileMetadata !== "object") {
    return profileMetadata ?? null
  }

  const rawAttributes = (profileMetadata as { attributes?: unknown }).attributes

  if (!Array.isArray(rawAttributes)) {
    return profileMetadata
  }

  return {
    ...profileMetadata,
    attributes: rawAttributes.filter((attribute) => {
      if (!attribute || typeof attribute !== "object") {
        return false
      }

      return !isHiddenUserAttributeName((attribute as { name?: string }).name)
    }),
  }
}

export function stripHiddenUserAttributesFromPatch<T extends Record<string, unknown>>(patch: T): T {
  const rawAttributes = patch.attributes

  if (!rawAttributes || typeof rawAttributes !== "object" || Array.isArray(rawAttributes)) {
    return patch
  }

  return {
    ...patch,
    attributes: Object.fromEntries(
      Object.entries(rawAttributes).filter(([name]) => !isHiddenUserAttributeName(name)),
    ),
  }
}
