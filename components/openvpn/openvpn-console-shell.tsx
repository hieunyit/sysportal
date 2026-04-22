"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { GitBranch, Network, UserRound, Users } from "lucide-react"
import { AccountMenu } from "@/components/dashboard/account-menu"
import { MobileNav } from "@/components/dashboard/mobile-nav"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type OpenVpnMetricTone = "neutral" | "success" | "warning" | "danger"

interface OpenVpnMetric {
  label: string
  value: ReactNode
  helper?: string
  tone?: OpenVpnMetricTone
}

const openVpnNavItems = [
  { href: "/openvpn/users", label: "Users", icon: UserRound },
  { href: "/openvpn/groups", label: "Groups", icon: Users },
]

function metricToneClassName(tone: OpenVpnMetricTone = "neutral") {
  switch (tone) {
    case "success":
      return "text-emerald-600 dark:text-emerald-400"
    case "warning":
      return "text-amber-700 dark:text-amber-300"
    case "danger":
      return "text-rose-700 dark:text-rose-300"
    default:
      return "text-foreground"
  }
}

export function OpenVpnConsoleShell({
  title,
  description,
  context,
  actions,
  metrics,
  children,
}: {
  title: string
  description: string
  context: string
  actions?: ReactNode
  metrics?: OpenVpnMetric[]
  children: ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-border/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <MobileNav />
            <Badge
              variant="outline"
              className="hidden h-8 items-center gap-2 rounded-lg border-border/80 bg-muted/30 px-3 text-foreground md:inline-flex"
            >
              <Network className="h-3.5 w-3.5" />
              OpenVPN Access Server
            </Badge>
          </div>

          <div className="flex items-center gap-2 self-end xl:self-auto">
            <AccountMenu />
          </div>
        </div>

        <div className="border-b border-border/80 px-5 py-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{context}</span>
                <span className="hidden lg:inline">Global &gt; Group &gt; User inheritance</span>
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </div>

            {actions ? <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">{actions}</div> : null}
          </div>
        </div>

        <div className="border-b border-border/80 px-5 py-3">
          <nav className="flex flex-wrap gap-2">
            {openVpnNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "border-border bg-accent text-accent-foreground"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {metrics?.length ? (
          <div className="grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-card px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {metric.label}
                </p>
                <p className={cn("mt-2 text-xl font-semibold tracking-tight", metricToneClassName(metric.tone))}>
                  {metric.value}
                </p>
                {metric.helper ? <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {children}
    </div>
  )
}

export function OpenVpnPanel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/80 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={cn("px-5 py-5", bodyClassName)}>{children}</div>
    </section>
  )
}
