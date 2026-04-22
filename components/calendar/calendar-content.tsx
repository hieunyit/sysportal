"use client"

import { CalendarRange, Clock3, RefreshCcw, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { changeAgenda, changePolicies, changeWindows } from "@/lib/identity-ops-data"

function getImpactClass(impact: string) {
  switch (impact) {
    case "Low risk":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    case "Notification required":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    default:
      return "border-rose-500/20 bg-rose-500/10 text-rose-300"
  }
}

export function CalendarContent() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming change windows</CardTitle>
            <CardDescription>Registered maintenance windows, sync batches, and governance checkpoints.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {changeWindows.map((window) => (
              <div key={window.id} className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarRange className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{window.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {window.date} | {window.time}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={getImpactClass(window.impact)}>
                    {window.impact}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today&apos;s watch list</CardTitle>
            <CardDescription>Shift checkpoints that need owners and approvers ready.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {changeAgenda.map((item) => (
              <div key={`${item.time}-${item.title}`} className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.time}</p>
                  <p className="mt-1 text-sm text-foreground">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.owner}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Change guardrails</CardTitle>
          <CardDescription>Shared operating rules to keep rollout, approval, and rollback behavior consistent.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {changePolicies.map((rule, index) => {
            const Icon = index === 0 ? ShieldCheck : index === 1 ? CalendarRange : RefreshCcw

            return (
              <div key={rule.title} className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="font-medium text-foreground">{rule.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{rule.detail}</p>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
