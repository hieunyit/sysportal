import Link from "next/link"
import {
  Activity,
  ArrowRight,
  FileCode2,
  KeyRound,
  Network,
  ServerCog,
} from "lucide-react"
import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const overviewMetrics = [
  {
    title: "Keycloak users",
    value: "12,480",
    detail: "Accounts ready for direct admin actions.",
    icon: KeyRound,
  },
  {
    title: "OpenVPN subjects",
    value: "642",
    detail: "Users and groups under policy control.",
    icon: Network,
  },
  {
    title: "Email templates",
    value: "14",
    detail: "Operational notification templates.",
    icon: FileCode2,
  },
  {
    title: "Audit events",
    value: "80",
    detail: "Recent events in the audit console.",
    icon: Activity,
  },
] as const

const platformHealth = [
  {
    name: "Keycloak",
    status: "Healthy",
    detail: "User, group, and session operations are healthy.",
  },
  {
    name: "OpenVPN",
    status: "Monitoring",
    detail: "Policy surfaces are available and under watch.",
  },
  {
    name: "SMTP",
    status: "Healthy",
    detail: "Template delivery is available.",
  },
  {
    name: "Settings store",
    status: "Healthy",
    detail: "Workspace preferences are being persisted.",
  },
] as const

const operatingSurfaces = [
  {
    title: "Keycloak directory",
    description: "Users, groups, sessions, and account administration.",
    href: "/users",
    icon: KeyRound,
    badge: "Directory",
  },
  {
    title: "OpenVPN access",
    description: "Users, groups, routing, and rulesets.",
    href: "/openvpn/users",
    icon: Network,
    badge: "VPN",
  },
  {
    title: "Connections",
    description: "Connector configuration and verification.",
    href: "/connections",
    icon: ServerCog,
    badge: "Config",
  },
  {
    title: "Audit log",
    description: "Access and configuration history.",
    href: "/analytics",
    icon: Activity,
    badge: "Audit",
  },
  {
    title: "Templates",
    description: "Email library and template editor.",
    href: "/content-generator",
    icon: FileCode2,
    badge: "Templates",
  },
] as const

function getStatusClass(status: string) {
  switch (status) {
    case "Healthy":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    case "Monitoring":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    default:
      return "border-rose-500/20 bg-rose-500/10 text-rose-300"
  }
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Header
        title="Identity operations console"
        description="Operate Keycloak, OpenVPN, templates, connections, and audit from one workspace."
        actions={
          <>
            <Button asChild>
              <Link href="/users">
                Open users
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/connections">Review connections</Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">{metric.value}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.detail}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-primary/20 bg-primary/10 text-primary">
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.05fr,0.95fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Platform health</CardTitle>
              <CardDescription>Current status of the main systems.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {platformHealth.map((system) => (
                <div key={system.name} className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{system.name}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{system.detail}</p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", getStatusClass(system.status))}>
                      {system.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Focus areas</CardTitle>
              <CardDescription>The main operator surfaces in this workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">Keycloak administration</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  User, group, and session management stays first-class.
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">OpenVPN policy control</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  User and group policy stays close to routing detail.
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                <p className="text-sm font-semibold text-foreground">Operational support layers</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Audit, settings, and templates stay visible without filler pages.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {operatingSurfaces.map((surface) => (
            <Link
              key={surface.href}
              href={surface.href}
              className="group rounded-[1.4rem] border border-border/70 bg-card/92 p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.9)] transition-all hover:border-primary/30 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <Badge variant="outline">{surface.badge}</Badge>
                  <div>
                    <h2 className="text-xl font-semibold tracking-[-0.03em] text-foreground">{surface.title}</h2>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{surface.description}</p>
                  </div>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] border border-primary/20 bg-primary/10 text-primary">
                  <surface.icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Open surface</span>
                <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                  Continue
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </AppShell>
  )
}
