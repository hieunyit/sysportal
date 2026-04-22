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

        <div className="mt-5 space-y-5">
          <Card>
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

                  <div className="grid gap-3 md:grid-cols-3">
                    {[dashboardHero.shift, dashboardHero.sla, dashboardHero.release].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border/80 bg-muted/20 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
                        <p className="mt-3 text-lg font-semibold text-foreground">{item.value}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Priority alerts</p>
                      <p className="text-sm text-muted-foreground">Issues that can directly impact access delivery</p>
                    </div>
                    <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-300">
                      2 high priority
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-4">
                    {alertFeed.map((alert) => (
                      <div key={alert.title} className="rounded-xl border border-border/80 bg-background p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-foreground">{alert.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{alert.detail}</p>
                          </div>
                          <span className={cn("shrink-0 text-xs font-semibold", getSeverityClass(alert.severity))}>
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
                <Card key={card.title}>
                  <CardContent className="px-5 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{card.title}</p>
                        <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{card.value}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{card.detail}</p>
                      </div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.45fr,0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connector health</CardTitle>
                <CardDescription>Current synchronization state, ownership, and live workload across managed systems.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>System</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last sync</TableHead>
                      <TableHead className="text-right">Workload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systems.map((system) => (
                      <TableRow key={system.id}>
                        <TableCell className="font-medium text-foreground">{system.name}</TableCell>
                        <TableCell className="text-muted-foreground">{system.owner}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("rounded-full", getStatusClass(system.status))}>
                            {system.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{system.sync}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{system.workload}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Policy coverage</CardTitle>
                  <CardDescription>Governance checks for privileged access, authentication strength, and source-of-truth alignment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {policyChecks.map((item) => (
                    <div key={item.label} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-foreground">{item.label}</p>
                        <span className="text-sm font-medium text-muted-foreground">{item.value}%</span>
                      </div>
                      <Progress value={item.value} className="h-2.5 bg-primary/12" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent activity</CardTitle>
                  <CardDescription>Latest events recorded by the control plane.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activityItems.map((item) => (
                    <div key={`${item.title}-${item.time}`} className="flex items-start gap-3">
                      <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <span className="text-xs text-muted-foreground">{item.time}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr,0.9fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Approval queue</CardTitle>
                <CardDescription>Requests that still need a decision inside the next two hours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {approvalQueue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border/80 bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground">{item.request}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.requester} | {item.system}
                        </p>
                      </div>
                      <Badge variant="outline" className={cn("rounded-full", getPriorityClass(item.priority))}>
                        {item.priority}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Clock3 className="h-4 w-4" />
                        SLA remaining {item.sla}
                      </span>
                      <Button
                        variant="ghost"
                        className="h-auto px-0 font-medium text-primary hover:bg-transparent hover:text-primary/80"
                      >
                        Open details
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Today&apos;s operations</CardTitle>
                <CardDescription>Shift milestones that can impact access delivery and synchronization.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayOperations.map((item) => (
                  <div key={`${item.time}-${item.title}`} className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.time}</p>
                      <p className="mt-1 text-sm text-foreground">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API coverage</CardTitle>
                <CardDescription>Included mock management endpoints for UI data, approval flows, and platform actions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4">
                  <p className="text-3xl font-semibold tracking-tight text-foreground">{apiCatalog.length}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Available endpoints under app/api</p>
                </div>
                {controlGaps.map((item) => {
                  const Icon = gapIconMap[item.icon]

                  return (
                    <div key={item.title} className="rounded-xl border border-border/80 bg-muted/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm text-foreground">{item.title}</p>
                        </div>
                        <span className="text-2xl font-semibold tracking-tight text-foreground">{item.value}</span>
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
