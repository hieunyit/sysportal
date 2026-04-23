import { z } from "zod"
import type { KeycloakUserRepresentation } from "@/lib/keycloak-admin"

const optionalDisplayField = z.string().trim().max(255)
const optionalEmailField = z.union([z.string().trim().email().max(255), z.literal("")])
const requiredActionsSchema = z.array(z.string().trim().min(1).max(120)).default([])
const attributeScalarSchema = z.string().trim().max(400)
const attributeListSchema = z.array(attributeScalarSchema)
const attributesSchema = z.record(z.union([attributeScalarSchema, attributeListSchema])).default({})

const baseUserSchema = z
  .object({
    username: z.string().trim().min(1).max(255),
    firstName: optionalDisplayField.default(""),
    lastName: optionalDisplayField.default(""),
    email: optionalEmailField.default(""),
    enabled: z.boolean().default(true),
    emailVerified: z.boolean().default(false),
    requiredActions: requiredActionsSchema,
    attributes: attributesSchema,
  })
  .passthrough()

export const keycloakUserCreateSchema = baseUserSchema
  .extend({
    password: z.string().max(255).optional().default(""),
    temporaryPassword: z.boolean().default(true),
    welcomeRecipientEmail: optionalEmailField.default(""),
    workAddress: z.string().trim().max(255).default(""),
    workStartDate: z.string().trim().max(255).default(""),
    groupIds: z.array(z.string().trim().min(1)).default([]),
    groups: z.array(z.string().trim().min(1)).default([]),
  })

export const keycloakUserPatchSchema = baseUserSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one user field is required",
  })

export const keycloakPasswordResetSchema = z.object({
  password: z.string().trim().min(1).max(255),
  temporary: z.boolean().default(false),
})

export type KeycloakUserCreateInput = z.infer<typeof keycloakUserCreateSchema>
export type KeycloakUserPatchInput = z.infer<typeof keycloakUserPatchSchema>
export type KeycloakPasswordResetInput = z.infer<typeof keycloakPasswordResetSchema>

function hasOwn(input: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(input, key)
}

export function normalizeAttributes(
  attributes: Record<string, unknown>,
): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(attributes)
      .map(([key, values]) => [
        key.trim(),
        (Array.isArray(values) ? values : [values])
          .map((value) => String(value ?? "").trim())
          .filter(Boolean),
      ])
      .filter(([key, values]) => key && values.length > 0),
  )
}

export function buildUserRepresentationPayload(
  input: Record<string, unknown>,
): Partial<KeycloakUserRepresentation> {
  const payload: Partial<KeycloakUserRepresentation> = {}

  if (hasOwn(input, "username")) {
    payload.username = String(input.username ?? "").trim()
  }

  if (hasOwn(input, "firstName")) {
    payload.firstName = String(input.firstName ?? "").trim()
  }

  if (hasOwn(input, "lastName")) {
    payload.lastName = String(input.lastName ?? "").trim()
  }

  if (hasOwn(input, "email")) {
    payload.email = String(input.email ?? "").trim()
  }

  if (hasOwn(input, "enabled")) {
    payload.enabled = Boolean(input.enabled)
  }

  if (hasOwn(input, "emailVerified")) {
    payload.emailVerified = Boolean(input.emailVerified)
  }

  if (hasOwn(input, "requiredActions")) {
    payload.requiredActions = (Array.isArray(input.requiredActions) ? input.requiredActions : [])
      .map((value) => String(value).trim())
      .filter(Boolean)
  }

  if (hasOwn(input, "attributes")) {
    payload.attributes = normalizeAttributes(
      (input.attributes as Record<string, string[]>) ?? {},
    )
  }

  return payload
}

export function mergeUserRepresentationPayload(
  currentUser: KeycloakUserRepresentation,
  patch: Record<string, unknown>,
) {
  const currentAttributes = normalizeAttributes((currentUser.attributes ?? {}) as Record<string, unknown>)
  const rawPatchAttributes =
    patch.attributes && typeof patch.attributes === "object" && !Array.isArray(patch.attributes)
      ? (patch.attributes as Record<string, unknown>)
      : null

  if (rawPatchAttributes) {
    Object.entries(rawPatchAttributes).forEach(([key, rawValue]) => {
      const values = Array.isArray(rawValue)
        ? rawValue.map((value) => String(value).trim()).filter(Boolean)
        : []

      if (values.length === 0) {
        delete currentAttributes[key]
        return
      }

      currentAttributes[key] = values
    })
  }

  const nextPayload = {
    ...(currentUser as Record<string, unknown>),
    ...patch,
    username: currentUser.username ?? "",
    firstName: currentUser.firstName ?? "",
    lastName: currentUser.lastName ?? "",
    email: currentUser.email ?? "",
    enabled: Boolean(currentUser.enabled),
    emailVerified: Boolean(currentUser.emailVerified),
    requiredActions: currentUser.requiredActions ?? [],
    attributes: currentAttributes,
    ...buildUserRepresentationPayload(patch),
  }

  return {
    ...nextPayload,
    attributes: normalizeAttributes(nextPayload.attributes ?? {}),
  }
}

export function buildFullUserUpdateModel(user: KeycloakUserRepresentation) {
  return {
    id: user.id ?? "",
    username: user.username ?? "",
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    emailVerified: Boolean(user.emailVerified),
    attributes: user.attributes ?? {},
    enabled: Boolean(user.enabled),
    origin: user.origin ?? null,
    createdTimestamp: user.createdTimestamp ?? null,
    totp: Boolean(user.totp),
    federationLink: user.federationLink ?? null,
    disableableCredentialTypes: user.disableableCredentialTypes ?? [],
    requiredActions: user.requiredActions ?? [],
    notBefore: user.notBefore ?? null,
    access: user.access ?? {},
  }
}

function sortStrings(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function arraysEqual(left: string[], right: string[]) {
  const sortedLeft = sortStrings(left)
  const sortedRight = sortStrings(right)

  return (
    sortedLeft.length === sortedRight.length &&
    sortedLeft.every((value, index) => value === sortedRight[index])
  )
}

export function getUserRepresentationMismatches(
  expected: ReturnType<typeof mergeUserRepresentationPayload>,
  actual: KeycloakUserRepresentation,
  requestedPatch: Record<string, unknown>,
) {
  const mismatches: string[] = []

  if (hasOwn(requestedPatch, "username") && (actual.username ?? "") !== expected.username) {
    mismatches.push("username")
  }

  if (hasOwn(requestedPatch, "firstName") && (actual.firstName ?? "") !== expected.firstName) {
    mismatches.push("firstName")
  }

  if (hasOwn(requestedPatch, "lastName") && (actual.lastName ?? "") !== expected.lastName) {
    mismatches.push("lastName")
  }

  if (hasOwn(requestedPatch, "email") && (actual.email ?? "") !== expected.email) {
    mismatches.push("email")
  }

  if (hasOwn(requestedPatch, "enabled") && Boolean(actual.enabled) !== Boolean(expected.enabled)) {
    mismatches.push("enabled")
  }

  if (hasOwn(requestedPatch, "emailVerified") && Boolean(actual.emailVerified) !== Boolean(expected.emailVerified)) {
    mismatches.push("emailVerified")
  }

  if (
    hasOwn(requestedPatch, "requiredActions") &&
    !arraysEqual(actual.requiredActions ?? [], expected.requiredActions ?? [])
  ) {
    mismatches.push("requiredActions")
  }

  if (hasOwn(requestedPatch, "attributes")) {
    const expectedAttributes = expected.attributes ?? {}
    const actualAttributes = normalizeAttributes(actual.attributes ?? {})
    const requestedAttributes =
      requestedPatch.attributes && typeof requestedPatch.attributes === "object" && !Array.isArray(requestedPatch.attributes)
        ? (requestedPatch.attributes as Record<string, unknown>)
        : {}
    const attributeKeys = Object.keys(requestedAttributes)

    const hasAttributeMismatch = attributeKeys.some((key) => {
      return !arraysEqual(actualAttributes[key] ?? [], expectedAttributes[key] ?? [])
    })

    if (hasAttributeMismatch) {
      mismatches.push("attributes")
    }
  }

  return mismatches
}
