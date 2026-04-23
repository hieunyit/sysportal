import Link from "next/link"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCode2,
  KeyRound,
  Network,
  Pause,
  ServerCog,
  TrendingUp,
} from "lucide-react"
import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const keyMetrics = [
  {
    title: "System Health",
    value: "98.7%",
    detail: "Uptime across all services",
    icon: CheckCircle2,
    trend: "+2.1%",
  },
  {
    title: "Active Incidents",
    value: "3",
    detail: "Requiring attention",
    icon: AlertTriangle,
    trend: "-1",
  },
  {
    title: "Mean Response Time",
    value: "4.2m",
    detail: "Average incident response",
    icon: Clock,
    trend: "-12%",
  },
  {
    title: "Resolved Today",
    value: "12",
    detail: "Total incidents resolved",
    icon: TrendingUp,
    trend: "+3",
  },
]

const recentIncidents = [
  {
    id: 1,
    title: "Database connection timeout",
    severity: "Critical",
    status: "In Progress",
    time: "5 minutes ago",
  },
  {
    id: 2,
    title: "High memory usage detected",
    severity: "Warning",
    status: "Monitoring",
    time: "14 minutes ago",
  },
  {
    id: 3,
    title: "SSL certificate expiration",
    severity: "High",
    status: "Acknowledged",
    time: "22 minutes ago",
  },
]

const deploymentStatus = [
  {
    name: "Keycloak",
    version: "v24.0.1",
    status: "Healthy",
    detail: "All services operational",
  },
  {
    name: "OpenVPN",
    version: "v2.6.8",
    status: "Healthy",
    detail: "Under normal load",
  },
  {
    name: "API Gateway",
    version: "v3.2.4",
    status: "Monitoring",
    detail: "Elevated response times",
  },
]

const operatingSurfaces = [
  {
    title: "Keycloak Management",
    description: "Users, groups, sessions, and authentication control.",
    href: "/users",
    icon: KeyRound,
    badge: "Identity",
  },
  {
    title: "Network Access",
    description: "VPN users, groups, routing, and policy rules.",
    href: "/openvpn/users",
    icon: Network,
    badge: "Network",
  },
  {
    title: "System Status",
    description: "Connector health, configuration, and verification.",
    href: "/connections",
    icon: ServerCog,
    badge: "Health",
  },
  {
    title: "Audit Logs",
    description: "Access history, configuration changes, and events.",
    href: "/analytics",
    icon: Activity,
    badge: "Audit",
  },
  {
    title: "Templates",
    description: "Email templates and notification management.",
    href: "/content-generator",
    icon: FileCode2,
    badge: "Templates",
  },
]

function getSeverityClass(severity: string) {
  switch (severity) {
    case "Critical":
      return "border-red-500/20 bg-red-500/10 text-red-300"
    case "High":
      return "border-orange-500/20 bg-orange-500/10 text-orange-300"
    case "Warning":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    default:
      return "border-green-500/20 bg-green-500/10 text-green-300"
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case "Healthy":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    case "Monitoring":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    case "In Progress":
      return "border-blue-500/20 bg-blue-500/10 text-blue-300"
    default:
      return "border-rose-500/20 bg-rose-500/10 text-rose-300"
  }
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Header
        title="Engineering Metrics & Incident Response"
        description="Monitor system health, track incidents, manage deployments, and analyze engineering performance in real-time."
        actions={
          <>
            <Button asChild>
              <Link href="/analytics">
                View Incidents
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/connections">System Status</Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 space-y-6">
        {/* Key Metrics */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {keyMetrics.map((metric) => (
            <Card key={metric.title}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                    <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">{metric.value}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{metric.detail}</p>
                      <span className={cn("text-xs font-semibold", metric.trend.startsWith("+") ? "text-emerald-400" : "text-emerald-400")}>
                        {metric.trend}
                      </span>
                    </div>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-primary/20 bg-primary/10 text-primary">
                    <metric.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Main Content Grid */}
        <section className="grid gap-4 xl:grid-cols-[1fr,1.1fr]">
          {/* Recent Incidents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Incidents</CardTitle>
              <CardDescription>Active and recent incidents requiring attention.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{incident.title}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">{incident.time}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("shrink-0 text-xs", getSeverityClass(incident.severity))}>
                        {incident.severity}
                      </Badge>
                      <Badge variant="outline" className={cn("shrink-0 text-xs", getStatusClass(incident.status))}>
                        {incident.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Deployment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deployment Status</CardTitle>
              <CardDescription>Current version and health of key services.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deploymentStatus.map((service) => (
                <div key={service.name} className="rounded-[1.2rem] border border-border/70 bg-background/60 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold tracking-[-0.02em] text-foreground">{service.name}</p>
                        <Badge variant="outline" className="text-xs">{service.version}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">{service.detail}</p>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", getStatusClass(service.status))}>
                      {service.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Operating Surfaces */}
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
                    <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">{surface.title}</h2>
                    <p className="mt-2 text-sm leading-5 text-muted-foreground">{surface.description}</p>
                  </div>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.25rem] border border-primary/20 bg-primary/10 text-primary">
                  <surface.icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Access</span>
                <span className="inline-flex items-center gap-2 font-semibold text-foreground">
                  Open
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
