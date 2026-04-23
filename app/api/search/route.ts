import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { createKeycloakAdminClient } from "@/lib/keycloak-admin"
import { createOpenVpnAdminClient } from "@/lib/openvpn-admin"
import { listEmailTemplates } from "@/lib/settings-store"

export const runtime = "nodejs"

interface SearchItem {
  id: string
  title: string
  subtitle: string
  href: string
  badge: string
}

function toDisplayName(input: {
  firstName?: string | null
  lastName?: string | null
  username?: string | null
  email?: string | null
}) {
  const fullName = [input.firstName, input.lastName].filter(Boolean).join(" ").trim()
  return fullName || input.username?.trim() || input.email?.trim() || "Unnamed record"
}

function matchesTemplateSearch(
  input: {
    name: string
    subject: string
    description: string
    category: string
  },
  query: string,
) {
  const haystack = [input.name, input.subject, input.description, input.category].join(" ").toLowerCase()
  return haystack.includes(query)
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url)
    const query = requestUrl.searchParams.get("query")?.trim() ?? ""

    if (query.length < 2) {
      return NextResponse.json({
        query,
        sections: [],
      })
    }

    const normalizedQuery = query.toLowerCase()
    const keycloakClient = await createKeycloakAdminClient()
    const openVpnClient = await createOpenVpnAdminClient()

    const [
      keycloakUsers,
      keycloakGroups,
      openVpnUsers,
      openVpnGroups,
      templates,
    ] = await Promise.all([
      keycloakClient.listUsers({
        search: query,
        max: 5,
        briefRepresentation: false,
      }),
      keycloakClient.listAllGroups(),
      openVpnClient.listAllUsers({
        search: query,
      }),
      openVpnClient.listAllGroups({
        search: query,
        enumerateMembers: false,
      }),
      Promise.resolve(listEmailTemplates()),
    ])

    const sections = [
      {
        id: "keycloak-users",
        label: "Keycloak users",
        items: keycloakUsers
          .filter((user) => Boolean(user.id))
          .slice(0, 5)
          .map<SearchItem>((user) => ({
            id: user.id ?? user.username ?? user.email ?? crypto.randomUUID(),
            title: toDisplayName(user),
            subtitle: [user.username, user.email].filter(Boolean).join(" • ") || "Keycloak user",
            href: `/users/${user.id}`,
            badge: "Keycloak",
          })),
      },
      {
        id: "keycloak-groups",
        label: "Keycloak groups",
        items: keycloakGroups
          .filter((group) => {
            const haystack = [group.name, group.path, group.description ?? ""].join(" ").toLowerCase()
            return haystack.includes(normalizedQuery)
          })
          .slice(0, 5)
          .map<SearchItem>((group) => ({
            id: group.id ?? group.path ?? group.name ?? crypto.randomUUID(),
            title: group.name ?? group.path ?? "Keycloak group",
            subtitle: group.path ?? group.description ?? "Keycloak group",
            href: `/groups/${group.id}`,
            badge: "Keycloak",
          })),
      },
      {
        id: "openvpn-users",
        label: "OpenVPN users",
        items: openVpnUsers.slice(0, 5).map<SearchItem>((profile) => ({
          id: profile.name,
          title: profile.name,
          subtitle: profile.group?.trim() ? `Group ${profile.group.trim()}` : "OpenVPN user",
          href: `/openvpn/users/${encodeURIComponent(profile.name)}`,
          badge: "OpenVPN",
        })),
      },
      {
        id: "openvpn-groups",
        label: "OpenVPN groups",
        items: openVpnGroups.slice(0, 5).map<SearchItem>((profile) => ({
          id: profile.name,
          title: profile.name,
          subtitle: `${profile.member_count ?? 0} member(s)`,
          href: `/openvpn/groups/${encodeURIComponent(profile.name)}`,
          badge: "OpenVPN",
        })),
      },
      {
        id: "templates",
        label: "Email templates",
        items: templates
          .filter((template) => matchesTemplateSearch(template, normalizedQuery))
          .slice(0, 5)
          .map<SearchItem>((template) => ({
            id: template.id,
            title: template.name,
            subtitle: template.description,
            href: `/content-generator/${template.id}`,
            badge: template.category,
          })),
      },
    ].filter((section) => section.items.length > 0)

    return NextResponse.json({
      query,
      sections,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to execute global search",
        detail: getErrorDetail(error, "Search is temporarily unavailable"),
      },
      { status: 500 },
    )
  }
}
