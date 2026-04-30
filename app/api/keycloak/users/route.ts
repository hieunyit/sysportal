import { randomInt } from "node:crypto"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import {
  apiErrorResponse,
  apiProblemResponse,
  apiSuccess,
  apiValidationError,
} from "@/lib/api-response"
import { getErrorDetail } from "@/lib/error-utils"
import { renderTemplateText } from "@/lib/email-template-utils"
import { sendSmtpEmail } from "@/lib/connection-tests"
import {
  appendAuditLog,
  getEmailTemplate,
  getNotificationSetting,
  getSystemConnection,
  upsertSettingOption,
} from "@/lib/settings-store"
import {
  buildUserRepresentationPayload,
  keycloakUserCreateSchema,
} from "@/lib/keycloak-user-mutations"
import {
  mapKeycloakValidationError,
  validateKeycloakProfileInput,
} from "@/lib/keycloak-user-profile-validation"
import { formatZodError } from "@/lib/settings-validation"
import {
  createKeycloakAdminClient,
  epochToIso,
  getPasswordCredential,
  KeycloakApiError,
  type KeycloakComponentRepresentation,
  type KeycloakGroupRepresentation,
  type KeycloakUserRepresentation,
} from "@/lib/keycloak-admin"
import { createOpenVpnAdminClient } from "@/lib/openvpn-admin"
import type { SmtpSettingsRecord } from "@/lib/settings-store"

export const runtime = "nodejs"
const DEFAULT_CREATE_REQUIRED_ACTIONS = ["UPDATE_PASSWORD", "CONFIGURE_TOTP"] as const
const DEFAULT_EMPLOYEE_GROUP_NAME = "jira-servicedesk-users"
const WELCOME_EMAIL_NOTIFICATION_BY_USER_TYPE = {
  employee: "pref-1",
  partner: "pref-2",
  outsource: "pref-3",
} as const

function resolveWelcomeEmailNotificationId(userType: string) {
  const normalizedUserType = userType.trim().toLowerCase()

  if (!normalizedUserType) {
    return null
  }

  if (normalizedUserType in WELCOME_EMAIL_NOTIFICATION_BY_USER_TYPE) {
    return WELCOME_EMAIL_NOTIFICATION_BY_USER_TYPE[
      normalizedUserType as keyof typeof WELCOME_EMAIL_NOTIFICATION_BY_USER_TYPE
    ]
  }

  return normalizedUserType === "employee" ? "pref-1" : "pref-2"
}

function isWelcomeEmailEnabledForUserType(userType: string) {
  const notificationId = resolveWelcomeEmailNotificationId(userType)

  if (!notificationId) {
    return true
  }

  const setting = getNotificationSetting(notificationId)
  return setting?.enabled ?? true
}

function toDisplayName(user: KeycloakUserRepresentation) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim()
  return fullName || user.username || user.email || user.id || "Unnamed user"
}

function mapGroupSummary(group: KeycloakGroupRepresentation) {
  return {
    id: group.id ?? "",
    name: group.name ?? "",
    path: group.path ?? "",
  }
}

function getFirstAttributeValue(value: string[] | undefined) {
  return value?.find((item) => item.trim())?.trim() ?? ""
}

function formatWorkStartDateForEmail(value: string) {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return ""
  }

  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch
    return `${day}/${month}/${year}`
  }

  const dateTimeMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}:\d{2})(?::\d{2})?/)

  if (dateTimeMatch) {
    const [, year, month, day, time] = dateTimeMatch
    return `${time} ${day}/${month}/${year}`
  }

  return trimmedValue
}

function resolveRequestedGroups(
  groups: KeycloakGroupRepresentation[],
  requestedIdentifiers: string[],
) {
  const groupsById = new Map<string, KeycloakGroupRepresentation>()
  const groupsByPath = new Map<string, KeycloakGroupRepresentation>()
  const groupsByName = new Map<string, KeycloakGroupRepresentation[]>()

  groups.forEach((group) => {
    if (group.id) {
      groupsById.set(group.id, group)
    }

    if (group.path?.trim()) {
      groupsByPath.set(group.path.trim().toLowerCase(), group)
    }

    if (group.name?.trim()) {
      const normalizedName = group.name.trim().toLowerCase()
      const currentEntries = groupsByName.get(normalizedName) ?? []
      currentEntries.push(group)
      groupsByName.set(normalizedName, currentEntries)
    }
  })

  const resolvedGroups: Array<{
    groupId: string
    groupName: string
  }> = []
  const unresolvedGroups: Array<{
    identifier: string
    error: string
  }> = []
  const seenGroupIds = new Set<string>()

  requestedIdentifiers.forEach((rawIdentifier) => {
    const identifier = rawIdentifier.trim()

    if (!identifier) {
      return
    }

    let match = groupsById.get(identifier)

    if (!match) {
      match =
        groupsByPath.get(identifier.toLowerCase()) ??
        (identifier.startsWith("/")
          ? undefined
          : groupsByPath.get(`/${identifier}`.toLowerCase()))
    }

    if (!match) {
      const nameMatches = groupsByName.get(identifier.toLowerCase()) ?? []

      if (nameMatches.length > 1) {
        unresolvedGroups.push({
          identifier,
          error: `Group "${identifier}" matches multiple Keycloak groups. Use a full group path or group ID instead.`,
        })
        return
      }

      match = nameMatches[0]
    }

    if (!match?.id) {
      unresolvedGroups.push({
        identifier,
        error: `Group "${identifier}" was not found in Keycloak.`,
      })
      return
    }

    if (seenGroupIds.has(match.id)) {
      return
    }

    seenGroupIds.add(match.id)
    resolvedGroups.push({
      groupId: match.id,
      groupName: match.path ?? match.name ?? identifier,
    })
  })

  return {
    resolvedGroups,
    unresolvedGroups,
  }
}

function getUserFullName(user: KeycloakUserRepresentation) {
  return (
    getFirstAttributeValue(user.attributes?.fullName) ||
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username?.trim() ||
    user.email?.trim() ||
    "New user"
  )
}

function getLdapEntryDn(user: KeycloakUserRepresentation) {
  const value = (user.attributes as Record<string, unknown> | undefined)?.LDAP_ENTRY_DN

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .find(Boolean) ?? ""
  }

  return typeof value === "string" ? value.trim() : ""
}

function isLdapDistinguishedName(value: string) {
  return /^cn=.+,dc=.+/i.test(value.trim()) || /^uid=.+,dc=.+/i.test(value.trim())
}

async function resolveManagerAttribute(
  client: Awaited<ReturnType<typeof createKeycloakAdminClient>>,
  managerValue: string,
) {
  const normalizedManagerValue = managerValue.trim()

  if (!normalizedManagerValue || isLdapDistinguishedName(normalizedManagerValue)) {
    return normalizedManagerValue
  }

  const matches = await client.listUsers({
    search: normalizedManagerValue,
    max: 25,
    briefRepresentation: false,
  })

  const hydratedMatches = await Promise.all(
    matches.map(async (user) => {
      if (!user.id) {
        return user
      }

      return getLdapEntryDn(user) ? user : client.getUser(user.id)
    }),
  )

  const exactMatches = hydratedMatches.filter((user) => {
    const username = user.username?.trim().toLowerCase() ?? ""
    const email = user.email?.trim().toLowerCase() ?? ""
    const candidate = normalizedManagerValue.toLowerCase()
    return username === candidate || email === candidate
  })

  if (exactMatches.length === 0) {
    throw new Error(`Manager lookup failed for "${normalizedManagerValue}". Use username, email, or LDAP_ENTRY_DN.`)
  }

  if (exactMatches.length > 1) {
    throw new Error(`Manager lookup is ambiguous for "${normalizedManagerValue}". Use a unique username or email.`)
  }

  const ldapEntryDn = getLdapEntryDn(exactMatches[0])

  if (!ldapEntryDn) {
    throw new Error(`Manager "${normalizedManagerValue}" does not have LDAP_ENTRY_DN in Keycloak.`)
  }

  return ldapEntryDn
}

function shuffleCharacters(values: string[]) {
  const next = [...values]

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1)
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }

  return next
}

function generateTemporaryPassword(length = 18) {
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const digits = "23456789"
  const symbols = "!@#$%*-_"
  const all = `${lower}${upper}${digits}${symbols}`

  const required = [
    lower[randomInt(lower.length)],
    upper[randomInt(upper.length)],
    digits[randomInt(digits.length)],
    symbols[randomInt(symbols.length)],
  ]

  const remaining = Array.from({ length: Math.max(length - required.length, 0) }, () =>
    all[randomInt(all.length)],
  )

  return shuffleCharacters([...required, ...remaining]).join("")
}

async function withLdapSyncRegistrations<T>(
  client: Awaited<ReturnType<typeof createKeycloakAdminClient>>,
  ldapProviderId: string,
  enabled: boolean,
  execute: () => Promise<T>,
) {
  const component = await client.getComponent(ldapProviderId)
  const originalConfig = { ...(component.config ?? {}) }
  const previousSyncRegistrations = originalConfig.syncRegistrations
    ? [...originalConfig.syncRegistrations]
    : undefined
  const targetValue = enabled ? "true" : "false"
  const needsToggle = previousSyncRegistrations?.[0] !== targetValue

  if (needsToggle) {
    await client.updateComponent(ldapProviderId, {
      ...(component as KeycloakComponentRepresentation),
      config: {
        ...originalConfig,
        syncRegistrations: [targetValue],
      },
    })
  }

  let executionSucceeded = false
  let executionError: unknown = null

  try {
    const result = await execute()
    executionSucceeded = true
    return result
  } catch (error) {
    executionError = error
    throw error
  } finally {
    if (needsToggle) {
      try {
        const restoredConfig = { ...originalConfig }

        if (previousSyncRegistrations) {
          restoredConfig.syncRegistrations = previousSyncRegistrations
        } else {
          delete restoredConfig.syncRegistrations
        }

        await client.updateComponent(ldapProviderId, {
          ...(component as KeycloakComponentRepresentation),
          config: restoredConfig,
        })
      } catch (restoreError) {
        console.error("Unable to restore LDAP syncRegistrations after user create.", restoreError)

        if (!executionSucceeded && !executionError) {
          throw restoreError
        }
      }
    }
  }
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(Number(searchParams.get("page") ?? "1"), 1)
    const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize") ?? "12"), 1), 25)
    const search = searchParams.get("search")?.trim() ?? ""
    const first = (page - 1) * pageSize
    const client = await createKeycloakAdminClient()
    const configuredRealm = (getSystemConnection("keycloak").config as { realm: string }).realm

    const [realm, totalUsers, enabledUsers, emailVerifiedUsers, users, filteredTotalFromSearch] = await Promise.all([
      client.getRealm(),
      client.countUsers(),
      client.countUsers({ enabled: true }),
      client.countUsers({ emailVerified: true }),
      client.listUsers({
        search: search || undefined,
        first,
        max: pageSize,
        briefRepresentation: false,
      }),
      search ? client.countUsers({ search }) : Promise.resolve<number | null>(null),
    ])
    const filteredTotal = search ? (filteredTotalFromSearch ?? 0) : totalUsers

    const items = await Promise.all(
      users.map(async (user) => {
        const userId = user.id ?? ""
        const [credentials, groupCount, groupsPreview] = await Promise.all([
          client.getUserCredentials(userId),
          client.getUserGroupsCount(userId),
          client.listUserGroups(userId, { first: 0, max: 4 }),
        ])
        const passwordCredential = getPasswordCredential(credentials)

        return {
          id: userId,
          username: user.username ?? "",
          displayName: toDisplayName(user),
          firstName: user.firstName ?? "",
          lastName: user.lastName ?? "",
          email: user.email ?? "",
          enabled: Boolean(user.enabled),
          emailVerified: Boolean(user.emailVerified),
          federationLink: user.federationLink ?? null,
          createdAt: epochToIso(user.createdTimestamp) ?? null,
          requiredActions: user.requiredActions ?? [],
          attributeCount: Object.keys(user.attributes ?? {}).length,
          passwordLastSetAt: epochToIso(passwordCredential?.createdDate) ?? null,
          passwordTemporary: Boolean(passwordCredential?.temporary),
          credentialTypes: credentials.map((credential) => credential.type).filter(Boolean),
          groupCount,
          groups: groupsPreview.map(mapGroupSummary),
        }
      }),
    )

    return apiSuccess({
      summary: {
        realm: realm.realm ?? configuredRealm,
        displayName: realm.displayName ?? null,
        totalUsers,
        enabledUsers,
        emailVerifiedUsers,
      },
      items,
      total: filteredTotal,
      page,
      pageSize,
      pageCount: Math.max(Math.ceil(filteredTotal / pageSize), 1),
      search,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load Keycloak users",
      detail: "Keycloak user inventory is unavailable",
      source: "keycloak",
    })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const payload = await request.json().catch(() => null)
    const parsed = keycloakUserCreateSchema.safeParse(payload)

    if (!parsed.success) {
      return apiValidationError({
        error: "Invalid Keycloak user payload",
        issues: formatZodError(parsed.error),
        source: "keycloak",
      })
    }

    const client = await createKeycloakAdminClient()
    const keycloakConnection = getSystemConnection("keycloak").config as {
      realm: string
      ldapProviderId?: string
    }
    const configuredRealm = keycloakConnection.realm
    const createPayload = buildUserRepresentationPayload(parsed.data)
    createPayload.emailVerified = true
    createPayload.requiredActions = [...DEFAULT_CREATE_REQUIRED_ACTIONS]
    const managerValue = getFirstAttributeValue(createPayload.attributes?.manager)

    if (managerValue) {
      let resolvedManagerValue = ""

      try {
        resolvedManagerValue = await resolveManagerAttribute(client, managerValue)
      } catch (managerLookupError) {
        return apiValidationError({
          error: "Keycloak user validation failed",
          detail: managerLookupError instanceof Error ? managerLookupError.message : "Manager lookup failed",
          issues: [
            {
              path: "attributes.manager",
              message:
                managerLookupError instanceof Error
                  ? managerLookupError.message
                  : "Manager lookup failed",
            },
          ],
          source: "keycloak",
        })
      }

      if (!createPayload.attributes) {
        createPayload.attributes = {}
      }

      createPayload.attributes.manager = [resolvedManagerValue]
    }

    const profileMetadata = await client.getUserProfileMetadata()
    const metadataIssues = validateKeycloakProfileInput(createPayload as Record<string, unknown>, profileMetadata)

    if (metadataIssues.length > 0) {
      return apiValidationError({
        error: "Keycloak user validation failed",
        detail: "The payload does not satisfy the current Keycloak user profile policy.",
        issues: metadataIssues,
        source: "keycloak",
      })
    }

    const userType = getFirstAttributeValue(createPayload.attributes?.userType)
    const department = userType === "employee" ? getFirstAttributeValue(createPayload.attributes?.department) : ""
    const workAddress = userType === "employee" ? parsed.data.workAddress.trim() : ""
    const workStartDate = userType === "employee" ? parsed.data.workStartDate.trim() : ""
    const requestedGroupIdentifiers = [
      ...(parsed.data.groupIds ?? []),
      ...(parsed.data.groups ?? []),
    ]
    const syncRegistrationsEnabled = userType === "employee"
    const ldapProviderId = keycloakConnection.ldapProviderId?.trim() ?? ""
    const welcomeRecipientEmail =
      userType === "employee"
        ? parsed.data.welcomeRecipientEmail.trim()
        : (createPayload.email ?? "").trim()
    const welcomeEmailNotificationId = resolveWelcomeEmailNotificationId(userType)
    const shouldSendWelcomeEmail = isWelcomeEmailEnabledForUserType(userType)
    const formattedWorkStartDate = formatWorkStartDateForEmail(workStartDate)
    const allGroups =
      userType === "employee" || requestedGroupIdentifiers.length > 0
        ? await client.listAllGroups()
        : []
    const { resolvedGroups: resolvedCustomGroups, unresolvedGroups } =
      requestedGroupIdentifiers.length > 0
        ? resolveRequestedGroups(allGroups, requestedGroupIdentifiers)
        : { resolvedGroups: [], unresolvedGroups: [] }

    if (userType === "employee" && shouldSendWelcomeEmail && !welcomeRecipientEmail) {
      return apiValidationError({
        error: "Invalid Keycloak user payload",
        issues: [
          {
            path: "welcomeRecipientEmail",
            message: "Welcome recipient email is required for employee accounts when welcome email is enabled",
          },
        ],
        source: "keycloak",
        status: 400,
      })
    }

    const created =
      ldapProviderId.length > 0
        ? await withLdapSyncRegistrations(client, ldapProviderId, syncRegistrationsEnabled, () =>
            client.createUser(createPayload),
          )
        : await client.createUser(createPayload)

    if (!created.userId) {
      throw new Error("Keycloak did not return a created user location.")
    }

    const providedPassword = parsed.data.password.trim()
    const finalPassword = providedPassword || generateTemporaryPassword()
    const generatedPassword = providedPassword ? null : finalPassword

    await client.resetUserPassword(created.userId, {
      password: finalPassword,
      temporary: parsed.data.temporaryPassword,
    })

    const user = await client.getUser(created.userId)
    let defaultGroupAssignment:
      | {
          groupName: string
          assigned: boolean
          error: string | null
        }
      | null = null
    
    const customGroupAssignments: Array<{
      groupId: string
      groupName: string
      assigned: boolean
      error: string | null
    }> = []

    // Assign to default employee group if employee type
    if (userType === "employee") {
      try {
        const defaultGroup =
          allGroups.find((group) => group.name === DEFAULT_EMPLOYEE_GROUP_NAME) ??
          allGroups.find((group) => group.path === `/${DEFAULT_EMPLOYEE_GROUP_NAME}`)

        if (!defaultGroup?.id) {
          defaultGroupAssignment = {
            groupName: DEFAULT_EMPLOYEE_GROUP_NAME,
            assigned: false,
            error: `Default group ${DEFAULT_EMPLOYEE_GROUP_NAME} was not found in Keycloak`,
          }
        } else {
          await client.addUserToGroup(created.userId, defaultGroup.id)
          defaultGroupAssignment = {
            groupName: defaultGroup.path ?? defaultGroup.name ?? DEFAULT_EMPLOYEE_GROUP_NAME,
            assigned: true,
            error: null,
          }
        }
      } catch (groupAssignmentError) {
        defaultGroupAssignment = {
          groupName: DEFAULT_EMPLOYEE_GROUP_NAME,
          assigned: false,
          error: getErrorDetail(groupAssignmentError, "Unable to assign default employee group"),
        }
      }
    }

    // Assign to custom selected groups (for all user types)
    unresolvedGroups.forEach((unresolvedGroup) => {
      customGroupAssignments.push({
        groupId: unresolvedGroup.identifier,
        groupName: unresolvedGroup.identifier,
        assigned: false,
        error: unresolvedGroup.error,
      })
    })

    if (resolvedCustomGroups.length > 0) {
      const assignmentResults = await Promise.all(
        resolvedCustomGroups.map(async (resolvedGroup) => {
          try {
            await client.addUserToGroup(created.userId, resolvedGroup.groupId)

            return {
              groupId: resolvedGroup.groupId,
              groupName: resolvedGroup.groupName,
              assigned: true,
              error: null,
            }
          } catch (singleGroupError) {
            return {
              groupId: resolvedGroup.groupId,
              groupName: resolvedGroup.groupName,
              assigned: false,
              error: getErrorDetail(singleGroupError, "Unable to assign group"),
            }
          }
        }),
      )

      customGroupAssignments.push(...assignmentResults)
    }

    const shouldCreateOpenVpnUser = parsed.data.createOpenVpnUser
    const vpnUsername = user.username ?? parsed.data.username.trim()
    const vpnGroup = parsed.data.openVpnGroup.trim() || null

    const [welcomeEmail, vpnUser] = await Promise.all([
      (async () => {
        if (!shouldSendWelcomeEmail || !welcomeRecipientEmail) {
          return null
        }

        const templateName = userType === "employee" ? "new-joiner-welcome" : "account-notification"
        const welcomeTemplate = getEmailTemplate(templateName)

        if (!welcomeTemplate) {
          return {
            sent: false,
            recipient: welcomeRecipientEmail,
            error: `Welcome email template (${templateName}) is not configured`,
          }
        }

        const smtpWelcomeConfig = getSystemConnection("smtp-welcome").config as SmtpSettingsRecord
        const templateData = {
          ...welcomeTemplate.sampleData,
          RecipientName: getUserFullName(user),
          EmployeeID: getFirstAttributeValue(user.attributes?.employeeID),
          Department: getFirstAttributeValue(user.attributes?.department),
          OnboardDate: formattedWorkStartDate,
          WorkAddress: workAddress,
          WorkStartDate: formattedWorkStartDate,
          WebmailURL:
            welcomeTemplate.sampleData.WebmailURL?.trim() || "https://outlook.office.com/mail/",
          Email: user.email?.trim() || "",
          TemporaryPassword: finalPassword,
          LoginURL:
            welcomeTemplate.sampleData.LoginURL?.trim() ||
            "https://sso.mobifonesolutions.vn/realms/mbfs-solutions/account",
        }

        try {
          await sendSmtpEmail(smtpWelcomeConfig, {
            to: welcomeRecipientEmail,
            subject: renderTemplateText(welcomeTemplate.subject, templateData),
            html: renderTemplateText(welcomeTemplate.html, templateData),
          })

          return {
            sent: true,
            recipient: welcomeRecipientEmail,
            error: null,
          }
        } catch (welcomeEmailError) {
          return {
            sent: false,
            recipient: welcomeRecipientEmail,
            error: getErrorDetail(welcomeEmailError, "Welcome email delivery failed"),
          }
        }
      })(),
      (async () => {
        if (!shouldCreateOpenVpnUser) {
          return null
        }

        try {
          const vpnClient = await createOpenVpnAdminClient()
          await vpnClient.createUser({ name: vpnUsername, group: vpnGroup })

          appendAuditLog({
            actorName: auth.actorName,
            category: "edit",
            action: "openvpn.user.created",
            resourceType: "openvpn-user",
            resourceId: vpnUsername,
            resourceName: vpnUsername,
            detail: `Created OpenVPN user ${vpnUsername} (via Keycloak user creation)`,
            metadata: { group: vpnGroup },
          })

          return { created: true, name: vpnUsername, group: vpnGroup, error: null }
        } catch (vpnError) {
          return {
            created: false,
            name: vpnUsername,
            group: vpnGroup,
            error: getErrorDetail(vpnError, "OpenVPN user creation failed"),
          }
        }
      })(),
    ])

    appendAuditLog({
      actorName: auth.actorName,
      category: "edit",
      action: "keycloak.user.created",
      resourceType: "keycloak-user",
      resourceId: created.userId,
      resourceName: toDisplayName(user),
      detail: `Created Keycloak user ${toDisplayName(user)}`,
      metadata: {
        realm: configuredRealm,
        userType,
        ldapProviderId: ldapProviderId || null,
        syncRegistrationsEnabled,
        temporaryPassword: parsed.data.temporaryPassword,
        passwordSource: providedPassword ? "provided" : "generated",
        welcomeRecipientEmail: shouldSendWelcomeEmail ? welcomeRecipientEmail || null : null,
        workAddress: workAddress || null,
        workStartDate: workStartDate || null,
        emailVerified: true,
        requiredActions: [...DEFAULT_CREATE_REQUIRED_ACTIONS],
        defaultGroupAssignment,
        customGroupAssignments: customGroupAssignments.length > 0 ? customGroupAssignments : null,
        welcomeEmailSent: welcomeEmail?.sent ?? false,
        welcomeEmailError: welcomeEmail?.error ?? null,
        welcomeEmailNotificationId,
        welcomeEmailNotificationEnabled: shouldSendWelcomeEmail,
        openVpnCreateRequested: parsed.data.createOpenVpnUser,
      },
    })

    if (department) {
      upsertSettingOption("department", department)
    }

    if (workAddress) {
      upsertSettingOption("workAddress", workAddress)
    }

    return apiSuccess(
      {
        id: created.userId,
        location: created.location,
        generatedPassword,
        passwordSource: providedPassword ? "provided" : "generated",
        temporaryPassword: parsed.data.temporaryPassword,
        welcomeRecipientEmail: shouldSendWelcomeEmail ? welcomeRecipientEmail || null : null,
        emailVerified: true,
        requiredActions: [...DEFAULT_CREATE_REQUIRED_ACTIONS],
        defaultGroupAssignment,
        customGroupAssignments: customGroupAssignments.length > 0 ? customGroupAssignments : null,
        welcomeEmailNotificationId,
        welcomeEmailNotificationEnabled: shouldSendWelcomeEmail,
        welcomeEmail,
        vpnUser,
        userType,
        user: {
          id: user.id ?? created.userId,
          username: user.username ?? "",
          displayName: toDisplayName(user),
          email: user.email ?? "",
          enabled: Boolean(user.enabled),
        },
      },
      { status: 201, message: `Created Keycloak user ${toDisplayName(user)}.` },
    )
  } catch (error) {
    if (error instanceof KeycloakApiError && error.status === 400) {
      const mapped = mapKeycloakValidationError(error)
      return apiProblemResponse({
        status: 422,
        error: mapped.error,
        detail: mapped.detail,
        issues: mapped.issues,
        source: "keycloak",
        upstream: error.payload,
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to create Keycloak user",
      detail: "Keycloak user creation failed",
      source: "keycloak",
    })
  }
}
