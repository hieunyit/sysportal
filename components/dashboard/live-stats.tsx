"use client"

import { useEffect, useState } from "react"
import { KeyRound, LoaderCircle, Network, ShieldCheck, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface LiveStat {
  label: string
  value: number | null
  sub: string | null
  icon: React.ElementType
  color: string
}

async function fetchCount(url: string, extract: (payload: unknown) => number | null): Promise<number | null> {
  try {
    const response = await fetch(url, { cache: "no-store" })
    if (!response.ok) return null
    const payload = await response.json()
    return extract(payload)
  } catch {
    return null
  }
}

export function DashboardLiveStats() {
  const [stats, setStats] = useState<LiveStat[]>([
    { label: "Keycloak users", value: null, sub: null, icon: Users, color: "text-indigo-600" },
    { label: "Enabled users", value: null, sub: null, icon: ShieldCheck, color: "text-emerald-600" },
    { label: "OpenVPN users", value: null, sub: null, icon: Network, color: "text-blue-600" },
    { label: "OpenVPN groups", value: null, sub: null, icon: KeyRound, color: "text-violet-600" },
  ])

  useEffect(() => {
    let isActive = true

    async function load() {
      const [kcUsers, vpnUsers, vpnGroups] = await Promise.all([
        fetchCount("/api/keycloak/users?page=1&pageSize=1", (p) => {
          const d = p as { summary?: { totalUsers?: number; enabledUsers?: number } }
          return d?.summary?.totalUsers ?? null
        }),
        fetchCount("/api/openvpn/users?page=1&pageSize=1", (p) => {
          const d = p as { summary?: { totalUsers?: number } }
          return d?.summary?.totalUsers ?? null
        }),
        fetchCount("/api/openvpn/groups?page=1&pageSize=1", (p) => {
          const d = p as { summary?: { totalGroups?: number } }
          return d?.summary?.totalGroups ?? null
        }),
      ])

      const kcEnabled = await fetchCount("/api/keycloak/users?page=1&pageSize=1", (p) => {
        const d = p as { summary?: { enabledUsers?: number } }
        return d?.summary?.enabledUsers ?? null
      })

      if (!isActive) return

      setStats([
        { label: "Keycloak users", value: kcUsers, sub: "All realm accounts", icon: Users, color: "text-indigo-600" },
        { label: "Enabled users", value: kcEnabled, sub: "Active Keycloak accounts", icon: ShieldCheck, color: "text-emerald-600" },
        { label: "OpenVPN users", value: vpnUsers, sub: "Local VPN profiles", icon: Network, color: "text-blue-600" },
        { label: "OpenVPN groups", value: vpnGroups, sub: "Shared VPN groups", icon: KeyRound, color: "text-violet-600" },
      ])
    }

    void load()

    return () => { isActive = false }
  }, [])

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-white border-gray-200 shadow-none">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                {stat.value === null ? (
                  <div className="mt-2 flex items-center gap-2 text-gray-400">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <p className="mt-2 text-3xl font-semibold text-gray-900">{stat.value.toLocaleString()}</p>
                )}
                {stat.sub ? <p className="mt-1 text-xs text-gray-400">{stat.sub}</p> : null}
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
