import Link from "next/link"
import {
  Activity,
  ArrowRight,
  FileCode2,
  KeyRound,
  Network,
  PencilLine,
  ServerCog,
  Clock,
  User,
} from "lucide-react"
import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { DashboardLiveStats } from "@/components/dashboard/live-stats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatTimestamp } from "@/lib/email-template-utils"
import { getAuditLogSummary, listAuditLogs } from "@/lib/settings-store"

function getResourceTypeLabel(value: string) {
  return value
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

function getActionVerb(action: string) {
  if (action.includes(".created")) return "Created"
  if (action.includes(".updated") || action.includes(".edited")) return "Updated"
  if (action.includes(".deleted") || action.includes(".removed")) return "Deleted"
  if (action.includes(".reset")) return "Reset"
  if (action.includes(".enabled")) return "Enabled"
  if (action.includes(".disabled")) return "Disabled"
  const last = action.split(".").at(-1) ?? action
  return last.charAt(0).toUpperCase() + last.slice(1)
}

const navSurfaces = [
  {
    title: "Keycloak Users",
    description: "Manage user accounts, attributes, credentials, and group memberships.",
    href: "/users",
    icon: KeyRound,
  },
  {
    title: "Keycloak Groups",
    description: "Organize users into groups and manage role assignments.",
    href: "/groups",
    icon: User,
  },
  {
    title: "OpenVPN",
    description: "VPN users, groups, certificates, and access policies.",
    href: "/openvpn/users",
    icon: Network,
  },
  {
    title: "Connections",
    description: "Connector health, configuration, and verification checks.",
    href: "/connections",
    icon: ServerCog,
  },
  {
    title: "Audit Log",
    description: "Full history of create, update, and delete operations.",
    href: "/analytics",
    icon: Activity,
  },
  {
    title: "Email Templates",
    description: "Welcome emails and notification template management.",
    href: "/content-generator",
    icon: FileCode2,
  },
]

export default function DashboardPage() {
  let summary = { total: 0, editCount: 0, latestAt: null as string | null }
  let recentChanges: ReturnType<typeof listAuditLogs> = []

  try {
    summary = getAuditLogSummary()
    recentChanges = listAuditLogs({ limit: 10 })
  } catch {
    // DB unavailable — show empty state
  }

  return (
    <AppShell>
      <Header
        title="Overview"
        description="Identity and access operations — Keycloak, OpenVPN, and system health."
      />

      <div className="p-6 space-y-6">
        {/* Live system metrics */}
        <DashboardLiveStats />

        {/* Audit stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="bg-white border-gray-200 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Total changes</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.total}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Create / Edit / Delete</p>
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{summary.editCount}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <PencilLine className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-none">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Last change</p>
                  <p className="mt-2 text-sm font-medium text-gray-900 leading-6">
                    {summary.latestAt ? formatTimestamp(summary.latestAt) : "No activity yet"}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),340px]">
          {/* Recent changes */}
          <Card className="bg-white border-gray-200 shadow-none">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-gray-900">Recent changes</CardTitle>
                  <CardDescription className="text-gray-500">Latest create, update, and delete operations.</CardDescription>
                </div>
                <Link
                  href="/analytics"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentChanges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <Activity className="h-8 w-8 text-gray-300 mb-3" />
                  <p className="text-sm font-medium text-gray-700">No changes recorded yet</p>
                  <p className="text-sm text-gray-500 mt-1">Create, update, or delete operations will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentChanges.map((item) => (
                    <div key={item.id} className="flex items-start gap-4 px-5 py-3.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 mt-0.5">
                        <PencilLine className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.detail}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {getResourceTypeLabel(item.resourceType)} · {getActionVerb(item.action)} · {item.actorName}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0 mt-0.5">{formatTimestamp(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 px-1 mb-3">Quick access</p>
            {navSurfaces.map((surface) => (
              <Link
                key={surface.href}
                href={surface.href}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3.5 hover:bg-gray-50 hover:border-gray-300 transition-colors group"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <surface.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{surface.title}</p>
                  <p className="text-xs text-gray-500 truncate">{surface.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
