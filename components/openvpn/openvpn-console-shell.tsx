"use client"

import type { ReactNode } from "react"
import { GitBranch } from "lucide-react"
import { cn } from "@/lib/utils"

type OpenVpnMetricTone = "neutral" | "success" | "warning" | "danger"

interface OpenVpnMetric {
  label: string
  value: ReactNode
  helper?: string
  tone?: OpenVpnMetricTone
}

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
  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/92 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.9)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_24%)]" />

        <div className="relative border-b border-border/70 px-5 py-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5 text-primary" />
                <span>{context}</span>
              </div>
              <div>
                <h1 className="text-[1.85rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.1rem]">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>

            {actions ? <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">{actions}</div> : null}
          </div>
        </div>

        {metrics?.length ? (
          <div className="relative grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="bg-card/92 px-4 py-3.5">
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
        "overflow-hidden rounded-[1.15rem] border border-border/70 bg-card/92 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.9)]",
        className,
      )}
    >
      <div className="flex flex-col gap-3 border-b border-border/70 px-5 py-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className={cn("px-5 py-4", bodyClassName)}>{children}</div>
    </section>
  )
}
