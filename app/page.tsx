"use client"

import { useState } from "react"
import {
  Activity,
  AlertTriangle,
  RefreshCcw,
  ShieldCheck,
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
  approvalQueue,
  dashboardSummaryCards,
  policyChecks,
  systems,
} from "@/lib/identity-ops-data"

const summaryIconMap = {
  key: KeyRound,
  network: Network,
  shield: ShieldCheck,
  alert: AlertTriangle,
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
          title="Operations Dashboard"
          description="Real-time monitoring of identity synchronization, system health, and approval workflows."
          actions={
            <>
              <Button className="h-9 rounded-lg px-3 text-sm">
                <ShieldCheck className="mr-2 h-4 w-4" />
                New Request
              </Button>
              <Button variant="outline" className="h-9 rounded-lg px-3 text-sm">
                <RefreshCcw className="mr-2 h-4 w-4" />
                Sync
              </Button>
            </>
          }
        />

        <div className="mt-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {dashboardSummaryCards.map((card) => {
              const Icon = summaryIconMap[card.icon]

              return (
                <Card key={card.title}>
                  <CardContent className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-primary/60 font-semibold">{card.title}</p>
                        <p className="mt-2 text-2xl font-bold text-foreground">{card.value}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr,0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Current status of core systems and connectors.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>System</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sync</TableHead>
                      <TableHead className="text-right">Workload</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systems.map((system) => (
                      <TableRow key={system.id}>
                        <TableCell className="font-medium text-foreground">{system.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{system.owner}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs", getStatusClass(system.status))}>
                            {system.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{system.sync}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{system.workload}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Alerts</CardTitle>
                  <CardDescription>Active issues</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {alertFeed.map((alert) => (
                    <div key={alert.title} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{alert.detail}</p>
                        </div>
                        <Badge variant="default" className="text-xs shrink-0">
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Approvals</CardTitle>
                  <CardDescription>Pending requests ({approvalQueue.length})</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {approvalQueue.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.request}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{item.requester}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Policy Compliance</CardTitle>
                <CardDescription>Governance check coverage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {policyChecks.map((item) => (
                  <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <span className="text-xs font-bold text-primary">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>Recent events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {activityItems.slice(0, 4).map((item) => (
                  <div key={`${item.title}-${item.time}`} className="flex items-start gap-2 py-1.5 text-sm">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Activity className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>


        </div>
      </main>
    </div>
  )
}
