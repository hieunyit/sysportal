import type {
  OpenVpnAccessListItem,
  OpenVpnAccessListType,
  OpenVpnAccessRoute,
  OpenVpnAccessRule,
  OpenVpnAccessRuleset,
  OpenVpnConnectedClient,
  OpenVpnGroupProfile,
  OpenVpnGroupSetPayload,
  OpenVpnUserProfile,
  OpenVpnUserPropValue,
  OpenVpnUserSetPayload,
  createOpenVpnAdminClient,
} from "@/lib/openvpn-admin"

export type OpenVpnSubjectType = "user" | "group"

export interface OpenVpnDetailRuleset extends OpenVpnAccessRuleset {
  rules: OpenVpnAccessRule[]
}

export interface OpenVpnSubjectDetail {
  subjectType: OpenVpnSubjectType
  name: string
  profile: OpenVpnUserProfile | OpenVpnGroupProfile
  accessLists: Record<OpenVpnAccessListType, OpenVpnAccessRoute[]>
  rulesets: OpenVpnDetailRuleset[]
  sessions: OpenVpnConnectedClient[]
  warnings: string[]
}

type OpenVpnClient = Awaited<ReturnType<typeof createOpenVpnAdminClient>>

export function getUserPropValue(input: OpenVpnUserPropValue | null | undefined) {
  return input?.value ?? null
}

export function getBooleanPropValue(input: OpenVpnUserPropValue | null | undefined) {
  const value = getUserPropValue(input)
  return typeof value === "boolean" ? value : null
}

export function getStringPropValue(input: OpenVpnUserPropValue | null | undefined) {
  const value = getUserPropValue(input)
  return typeof value === "string" ? value : null
}

export function buildAccessListItems(
  subjectType: OpenVpnSubjectType,
  name: string,
  listType: OpenVpnAccessListType,
  routes: OpenVpnAccessRoute[],
): OpenVpnAccessListItem[] {
  if (routes.length === 0) {
    return [
      subjectType === "user"
        ? {
            username: name,
            type: listType,
            access_route: null,
          }
        : {
            groupname: name,
            type: listType,
            access_route: null,
          },
    ]
  }

  return routes.map((route) =>
    subjectType === "user"
      ? {
          username: name,
          type: listType,
          access_route: route,
        }
      : {
          groupname: name,
          type: listType,
          access_route: route,
        },
  )
}

export function buildSubjectPropSetPayload(
  subjectType: OpenVpnSubjectType,
  payload: Record<string, unknown>,
) {
  return payload as OpenVpnUserSetPayload | OpenVpnGroupSetPayload
}

export function getNextRulesetPosition(rulesets: OpenVpnAccessRuleset[]) {
  const maxPosition = rulesets.reduce((max, ruleset) => Math.max(max, ruleset.position ?? 0), 0)
  return maxPosition + 100
}

export async function replaceRulesetRules(
  client: OpenVpnClient,
  rulesetId: number,
  nextRules: OpenVpnAccessRule[],
) {
  const currentRules = (await client.listRules({ rulesetIds: [rulesetId] })).rules ?? []
  const currentIds = new Set(currentRules.map((rule) => rule.id).filter((id): id is number => typeof id === "number"))
  const nextIds = new Set(nextRules.map((rule) => rule.id).filter((id): id is number => typeof id === "number"))
  const deleteIds = Array.from(currentIds).filter((id) => !nextIds.has(id))

  await client.modifyRules({
    add: nextRules,
    delete: deleteIds.length ? deleteIds : undefined,
  })
}

export async function loadOpenVpnSubjectDetail(
  client: OpenVpnClient,
  subjectType: OpenVpnSubjectType,
  name: string,
): Promise<OpenVpnSubjectDetail | null> {
  const profile =
    subjectType === "user"
      ? await client.getUser(name)
      : await client.getGroup(name, { enumerateMembers: true })

  if (!profile) {
    return null
  }

  const [accessResponse, rulesetResponse] = await Promise.all([
    subjectType === "user"
      ? client.listAccessLists({
          users: [name],
          filters: { object_type: "user" },
        })
      : client.listAccessLists({
          groups: [name],
          filters: { object_type: "group" },
        }),
    client.listRulesets({ owner: name }),
  ])

  const warnings: string[] = []
  let vpnClients: OpenVpnConnectedClient[] = []

  try {
    vpnClients = (await client.getVpnStatus()).vpn_clients ?? []
  } catch {
    warnings.push("Live VPN session data is currently unavailable.")
  }

  const rulesets = rulesetResponse.rulesets ?? []
  const rulesByRuleset = new Map<number, OpenVpnAccessRule[]>()

  if (rulesets.length > 0) {
    const ruleResponse = await client.listRules({
      rulesetIds: rulesets.map((ruleset) => ruleset.id),
    })

    for (const rule of ruleResponse.rules ?? []) {
      const bucket = rulesByRuleset.get(rule.ruleset_id) ?? []
      bucket.push(rule)
      rulesByRuleset.set(rule.ruleset_id, bucket)
    }
  }

  const accessLists: Record<OpenVpnAccessListType, OpenVpnAccessRoute[]> = {
    access_from_ipv6: [],
    access_from_ipv4: [],
    access_to_ipv4: [],
    access_to_ipv6: [],
  }

  for (const item of accessResponse.profiles ?? []) {
    const list = accessLists[item.type]

    if (!list || !item.access_route) {
      continue
    }

    list.push(item.access_route)
  }

  const groupMemberSet =
    subjectType === "group"
      ? new Set(((profile as OpenVpnGroupProfile).members ?? []).map((member) => member.trim()).filter(Boolean))
      : null

  const sessions = vpnClients
    .filter((session) => {
      const normalizedCommonName = session.commonname?.replace(/_AUTOLOGIN$/i, "")?.trim() ?? ""
      const normalizedUsername = session.username?.trim() ?? ""

      if (subjectType === "user") {
        return normalizedUsername === name || normalizedCommonName === name
      }

      if (!groupMemberSet || groupMemberSet.size === 0) {
        return false
      }

      return groupMemberSet.has(normalizedUsername || normalizedCommonName)
    })
    .sort((left, right) => {
      const leftTime = left.connected_since ? Date.parse(left.connected_since) : 0
      const rightTime = right.connected_since ? Date.parse(right.connected_since) : 0
      return rightTime - leftTime
    })

  return {
    subjectType,
    name,
    profile,
    accessLists,
    rulesets: rulesets.map((ruleset) => ({
      ...ruleset,
      rules: (rulesByRuleset.get(ruleset.id) ?? []).sort((left, right) => left.position - right.position),
    })),
    sessions,
    warnings,
  }
}
