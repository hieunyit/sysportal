import { z } from "zod"
import type { KeycloakApiError, KeycloakUserProfileMetadata } from "@/lib/keycloak-admin"

const emailValidator = z.string().email()
const coreFieldNames = new Set(["username", "email", "firstName", "lastName"])

export interface KeycloakValidationIssue {
  path: string
  message: string
}

function hasAdminPermission(roles?: string[]) {
  if (!roles || roles.length === 0) {
    return true
  }

  return roles.includes("admin")
}

function isRequired(required?: boolean | { roles?: string[] }) {
  if (typeof required === "boolean") {
    return required
  }

  return hasAdminPermission(required?.roles)
}

function getFieldPath(name: string) {
  return coreFieldNames.has(name) ? name : `attributes.${name}`
}

function normalizeValues(value: unknown, multivalued?: boolean) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? ""))
  }

  if (value === null || value === undefined) {
    return multivalued ? [] : [""]
  }

  return [String(value)]
}

function getAttributeValue(
  input: Record<string, unknown>,
  name: string,
  multivalued?: boolean,
) {
  if (coreFieldNames.has(name)) {
    return normalizeValues(input[name], multivalued)
  }

  const attributes =
    input.attributes && typeof input.attributes === "object" && !Array.isArray(input.attributes)
      ? (input.attributes as Record<string, unknown>)
      : {}

  return normalizeValues(attributes[name], multivalued)
}

function readNumber(input: unknown) {
  if (typeof input === "number" && Number.isFinite(input)) {
    return input
  }

  if (typeof input === "string" && input.trim()) {
    const parsed = Number(input)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function validateKeycloakProfileInput(
  input: Record<string, unknown>,
  profileMetadata?: KeycloakUserProfileMetadata | null,
) {
  const issues: KeycloakValidationIssue[] = []
  const attributes = Array.isArray(profileMetadata?.attributes) ? profileMetadata.attributes : []

  attributes.forEach((attribute) => {
    const name = attribute.name?.trim()

    if (!name) {
      return
    }

    const values = getAttributeValue(input, name, attribute.multivalued)
    const trimmedValues = values.map((value) => value.trim())
    const nonEmptyValues = trimmedValues.filter(Boolean)
    const path = getFieldPath(name)
    const validators = attribute.validators ?? {}

    if (isRequired(attribute.required) && nonEmptyValues.length === 0) {
      issues.push({
        path,
        message: "This field is required",
      })
      return
    }

    const multivaluedValidator =
      validators.multivalued && typeof validators.multivalued === "object"
        ? (validators.multivalued as Record<string, unknown>)
        : null
    const maxValueCount = readNumber(multivaluedValidator?.max)

    if (maxValueCount !== null && nonEmptyValues.length > maxValueCount) {
      issues.push({
        path,
        message: `At most ${maxValueCount} value${maxValueCount === 1 ? "" : "s"} allowed`,
      })
    }

    const optionsValidator =
      validators.options && typeof validators.options === "object"
        ? (validators.options as Record<string, unknown>)
        : null
    const allowedOptions = Array.isArray(optionsValidator?.options)
      ? optionsValidator.options.map((value) => String(value))
      : null

    if (allowedOptions && nonEmptyValues.some((value) => !allowedOptions.includes(value))) {
      issues.push({
        path,
        message: "Value must match one of the allowed options",
      })
    }

    const lengthValidator =
      validators.length && typeof validators.length === "object"
        ? (validators.length as Record<string, unknown>)
        : null
    const minLength = readNumber(lengthValidator?.min)
    const maxLength = readNumber(lengthValidator?.max)
    const ignoreEmpty = lengthValidator?.["ignore.empty.value"] === true || lengthValidator?.["ignore.empty.value"] === "true"

    trimmedValues.forEach((value) => {
      if (!value && ignoreEmpty) {
        return
      }

      if (minLength !== null && value.length < minLength) {
        issues.push({
          path,
          message:
            minLength === maxLength
              ? `Must be exactly ${minLength} characters`
              : `Must be at least ${minLength} characters`,
        })
      } else if (maxLength !== null && value.length > maxLength) {
        issues.push({
          path,
          message:
            minLength === maxLength
              ? `Must be exactly ${maxLength} characters`
              : `Must be at most ${maxLength} characters`,
        })
      }
    })

    if ("email" in validators) {
      nonEmptyValues.forEach((value) => {
        if (!emailValidator.safeParse(value).success) {
          issues.push({
            path,
            message: "Must be a valid email address",
          })
        }
      })
    }
  })

  return dedupeIssues(issues)
}

function dedupeIssues(issues: KeycloakValidationIssue[]) {
  const seen = new Set<string>()

  return issues.filter((issue) => {
    const key = `${issue.path}::${issue.message}`

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export function mapKeycloakValidationError(error: KeycloakApiError, fallbackPath = "request") {
  return {
    error: "Keycloak validation failed",
    detail: error.detail || "Keycloak rejected one or more fields",
    issues: [
      {
        path: fallbackPath,
        message: error.detail || "Keycloak rejected one or more fields",
      },
    ] satisfies KeycloakValidationIssue[],
  }
}
