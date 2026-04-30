"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  Building2,
  FileCode2,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ServerCog,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"

const navigationSections = [
  {
    label: "Command",
    items: [
      { icon: LayoutDashboard, label: "Overview", href: "/" },
      { icon: BarChart3, label: "Audit Log", href: "/analytics" },
    ],
  },
  {
    label: "Keycloak",
    items: [
      { icon: KeyRound, label: "Users", href: "/users" },
      { icon: Users, label: "Groups", href: "/groups" },
      { icon: Activity, label: "Sessions", href: "/sessions" },
      { icon: Building2, label: "Catalogs", href: "/users/catalogs" },
    ],
  },
  {
    label: "OpenVPN",
    items: [
      { icon: UserRound, label: "Users", href: "/openvpn/users" },
      { icon: Users, label: "Groups", href: "/openvpn/groups" },
    ],
  },
  {
    label: "Admin",
    items: [
      { icon: ServerCog, label: "Connections", href: "/connections" },
      { icon: FileCode2, label: "Email Templates", href: "/content-generator" },
      { icon: Settings, label: "Settings", href: "/settings" },
      { icon: LogOut, label: "Logout", href: "/logout" },
    ],
  },
] as const

interface ConnectorStatus {
  name: string
  ok: boolean
}

const CONNECTOR_STATUS_POLL_INTERVAL_MS = 5 * 60 * 1000

export function Sidebar() {
  const pathname = usePathname()
  const [connectorStatuses, setConnectorStatuses] = useState<ConnectorStatus[]>([])

  useEffect(() => {
    const fetchConnectorStatuses = async () => {
      try {
        const connectors = ["keycloak", "openvpn", "smtp", "smtp-welcome"]
        const results = await Promise.all(
          connectors.map(async (connector) => {
            try {
              const response = await fetch(`/api/connections/${connector}/checks`, { method: "POST" })
              const data = (await response.json()) as { ok?: boolean }
              return {
                name:
                  connector === "smtp-welcome"
                    ? "SMTP Welcome"
                    : connector.charAt(0).toUpperCase() + connector.slice(1),
                ok: data.ok ?? false,
              }
            } catch {
              return {
                name:
                  connector === "smtp-welcome"
                    ? "SMTP Welcome"
                    : connector.charAt(0).toUpperCase() + connector.slice(1),
                ok: false,
              }
            }
          }),
        )
        setConnectorStatuses(results)
      } catch {}
    }

    void fetchConnectorStatuses()
    const interval = setInterval(fetchConnectorStatuses, CONNECTOR_STATUS_POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <aside className="w-60 shrink-0 bg-slate-900 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-indigo-900/50">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">IdentityOps</p>
            <p className="text-slate-500 text-xs">Operations Console</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-5">
        {navigationSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    }`}
                  >
                    <item.icon
                      className={`w-4 h-4 shrink-0 transition-colors ${
                        isActive
                          ? "text-indigo-200"
                          : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    <span className="truncate flex-1">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300 shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Connector status */}
      {connectorStatuses.length > 0 && (
        <div className="p-2 border-t border-slate-700/50">
          <div className="px-3 py-2.5 rounded-lg bg-slate-800/60">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">
              Connectors
            </p>
            <div className="space-y-1.5">
              {connectorStatuses.map((c) => (
                <div key={c.name} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{c.name}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      c.ok ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {c.ok ? "Healthy" : "Error"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
