"use client"

import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Clock3,
  KeyRound,
  Network,
  RefreshCcw,
  ShieldCheck,
  Users,
} from "lucide-react"
import { Header } from "@/components/dashboard/header"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  activityItems,
  alertFeed,
  apiCatalog,
  approvalQueue,
  controlGaps,
  dashboardHero,
  dashboardSummaryCards,
  policyChecks,
  systems,
  todayOperations,
} from "@/lib/identity-ops-data"

const summaryIconMap = {
  key: KeyRound,
  network: Network,
  shield: ShieldCheck,
  alert: AlertTriangle,
} as const

const gapIconMap = {
  users: Users,
  badge: BadgeCheck,
  key: KeyRound,
} as const

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

function getPriorityClass(priority: string) {
  switch (priority) {
    case "High":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300"
    case "Medium":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    default:
      return "border-slate-500/20 bg-slate-500/10 text-slate-300"
  }
}

function getSeverityClass(severity: string) {
  switch (severity) {
    case "High":
      return "text-rose-300"
    case "Medium":
      return "text-amber-300"
    default:
      return "text-cyan-300"
  }
}

export default function DashboardPage() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>

      <main
        className={cn(
          "flex-1 p-4 transition-all duration-300 md:p-5 lg:p-6",
          isCollapsed ? "lg:ml-[4.75rem]" : "lg:ml-72",
        )}
      >
        <Header
          title="Identity and access operations center"
          description="Track connector health, identity synchronization, approval queues, and access risk across Keycloak, OpenVPN, Jira, ServiceDesk, and connected governance services."
          actions={
            <>
              <Button className="h-10 rounded-xl px-4 text-sm font-medium">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Create access request
              </Button>
              <Button variant="outline" className="h-10 rounded-xl border-border/80 bg-card px-4 text-sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Run sync now
              </Button>
            </>
          }
        />

        <div className="mt-6 space-y-6">
          <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(65,184,255,0.08)] hover:border-primary/40 transition-all duration-300">
            <CardContent className="px-6 py-6">
              <div className="grid gap-6 xl:grid-cols-[1.3fr,0.95fr]">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
                      {dashboardHero.badge}
                    </Badge>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{dashboardHero.title}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {dashboardHero.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {[dashboardHero.shift, dashboardHero.sla, dashboardHero.release].map((item) => (
                      <div key={item.label} className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/2 p-5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
                        <p className="text-xs uppercase tracking-[0.24em] text-primary/60 dark:text-primary/70 font-semibold">{item.label}</p>
                        <p className="mt-4 text-2xl font-bold text-foreground group-hover:text-primary transition-colors">{item.value}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-destructive/30 bg-gradient-to-br from-destructive/10 to-destructive/5 p-5 hover:border-destructive/50 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">Priority Alerts</p>
                      <p className="text-sm text-muted-foreground mt-1">Critical issues requiring immediate attention</p>
                    </div>
                    <Badge className="border-destructive/50 bg-destructive/15 text-destructive font-bold animate-pulse-glow">
                      2 Critical
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-3">
                    {alertFeed.map((alert) => (
                      <div key={alert.title} className="rounded-lg border border-destructive/20 bg-background/50 hover:bg-background dark:bg-background/30 hover:border-destructive/40 p-4 transition-all duration-200 group">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-destructive transition-colors">{alert.title}</p>
                            <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{alert.detail}</p>
                          </div>
                          <span className={cn("shrink-0 text-xs font-bold px-2 py-1 rounded-lg", alert.severity === "High" ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-500")}>
                            {alert.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {dashboardSummaryCards.map((card) => {
              const Icon = summaryIconMap[card.icon]

              return (
                <Card key={card.title} className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 group">
                  <CardContent className="px-6 py-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.22em] text-primary/60 dark:text-primary/70 font-semibold">{card.title}</p>
                        <p className="mt-4 text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{card.value}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
                      </div>
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.45fr,0.95fr]">
            <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Connector Health</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">Current synchronization state, ownership, and live workload across managed systems.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-primary/20">
                      <TableHead className="text-primary font-bold">System</TableHead>
                      <TableHead className="text-primary font-bold">Owner</TableHead>
                      <TableHead className="text-primary font-bold">Status</TableHead>
                      <TableHead className="text-primary font-bold">Last Sync</TableHead>
                      <TableHead className="text-right text-primary font-bold">Workload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systems.map((system) => (
                      <TableRow key={system.id} className="border-primary/10 hover:bg-primary/5 transition-colors">
                        <TableCell className="font-semibold text-foreground">{system.name}</TableCell>
                        <TableCell className="text-muted-foreground">{system.owner}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-full font-bold", getStatusClass(system.status))}>
                            {system.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{system.sync}</TableCell>
                        <TableCell className="text-right text-muted-foreground font-semibold">{system.workload}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Policy Coverage</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">Governance checks for privileged access, authentication strength, and source-of-truth alignment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {policyChecks.map((item) => (
                    <div key={item.label} className="space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <span className="text-sm font-bold text-primary">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-2.5 bg-primary/15 rounded-full" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">Latest events recorded by the control plane.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityItems.map((item) => (
                    <div key={`${item.title}-${item.time}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors group">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">{item.meta}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr,0.9fr]">
            <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Approval Queue</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">Requests that need decision within the next two hours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvalQueue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/40 hover:bg-primary/10 p-4 transition-all duration-200 group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{item.request}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.requester} • {item.system}
                        </p>
                      </div>
                      <Badge className={cn("rounded-full font-bold", getPriorityClass(item.priority))}>
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Clock3 className="h-4 w-4" />
                        SLA: {item.sla}
                      </span>
                      <Button
                        variant="ghost"
                        className="h-auto px-0 font-semibold text-primary hover:bg-transparent hover:text-primary/80 transition-colors"
                      >
                        Details
                        <ArrowRight className="h-4 w-4 ml-1.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Today&apos;s Operations</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">Shift milestones affecting access delivery and synchronization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayOperations.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="flex items-start gap-4 p-3 rounded-lg hover:bg-primary/5 transition-colors group">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary">{item.time}</p>
                      <p className="mt-1.5 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-card/95 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-xl font-bold">API Coverage</CardTitle>
                <CardDescription className="text-muted-foreground mt-1">Management endpoints for data, approvals, and platform actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/2 p-4 hover:border-primary/40 transition-all">
                  <p className="text-3xl font-bold tracking-tight text-primary">{apiCatalog.length}</p>
                  <p className="mt-2 text-sm text-muted-foreground">Available endpoints under <code className="bg-primary/10 px-2 py-1 rounded text-xs font-mono">app/api</code></p>
                </div>
                {controlGaps.map((item) => {
                  const Icon = gapIconMap[item.icon]

                  return (
                    <div key={item.title} className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/40 hover:bg-primary/10 p-4 transition-all group">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.title}</p>
                        </div>
                        <span className="text-2xl font-bold text-primary">{item.value}</span>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </div>
  )
}
