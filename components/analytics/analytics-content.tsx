"use client"

import { useDeferredValue, useEffect, useState } from "react"
import { Activity, Clock3, Download, Filter, LoaderCircle, PencilLine, Search, Wrench } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTimestamp } from "@/lib/email-template-utils"

interface AuditSummary {
  total: number
  editCount: number
  latestAt: string | null
}

interface AuditItem {
  id: string
  actorName: string
  category: "edit"
  action: string
  resourceType: string
  resourceId: string
  resourceName: string
  detail: string
  createdAt: string
}

function getResourceTypeLabel(value: string) {
  return value
    .split("-")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function getActionLabel(value: string) {
  return value
    .split(".")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" / ")
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as { detail?: string; error?: string }
  return response.detail ?? response.error ?? fallback
}

export function AnalyticsContent() {
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [items, setItems] = useState<AuditItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [resourceType, setResourceType] = useState("all")
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isActive = true

    async function loadAudit() {
      try {
        setIsLoading(true)
        const searchParams = new URLSearchParams({ limit: "80" })

        if (resourceType !== "all") {
          searchParams.set("resourceType", resourceType)
        }

        if (deferredSearch.trim()) {
          searchParams.set("search", deferredSearch.trim())
        }

        const response = await fetch(`/api/audit?${searchParams.toString()}`, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(getErrorMessage(payload, "Unable to load audit log"))
        }

        if (!isActive) {
          return
        }

        const audit = payload as { ok: boolean; summary: AuditSummary; items: AuditItem[] }
        setSummary(audit.summary)
        setItems(audit.items ?? [])
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load audit log")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadAudit()

    return () => {
      isActive = false
    }
  }, [deferredSearch, resourceType])

  async function handleExportAll() {
    try {
      setIsExporting(true)
      const allItems: AuditItem[] = []
      const total = summary?.total ?? 0
      const pageSize = 200
      let offset = 0

      while (offset === 0 || allItems.length < total) {
        const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) })
        if (resourceType !== "all") params.set("resourceType", resourceType)
        if (deferredSearch.trim()) params.set("search", deferredSearch.trim())

        const response = await fetch(`/api/audit?${params.toString()}`, { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as { items?: AuditItem[] } | null
        if (!response.ok) throw new Error("Unable to export audit log")

        const page = payload?.items ?? []
        allItems.push(...page)
        offset += pageSize

        if (page.length < pageSize) break
      }

      const escape = (v: unknown) => {
        const s = String(v ?? "").replace(/"/g, '""')
        return /[",\n\r]/.test(s) ? `"${s}"` : s
      }
      const headers = ["actorName", "action", "resourceType", "resourceName", "detail", "createdAt"]
      const rows = allItems.map((item) =>
        [item.actorName, item.action, item.resourceType, item.resourceName, item.detail, item.createdAt]
          .map(escape)
          .join(","),
      )
      const blob = new Blob([`﻿${[headers.join(","), ...rows].join("\r\n")}`], {
        type: "text/csv;charset=utf-8;",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error("Export failed", { description: err instanceof Error ? err.message : "Unable to export audit log" })
    } finally {
      setIsExporting(false)
    }
  }

  const resourceTypeOptions = Array.from(new Set(items.map((item) => item.resourceType))).sort()

  if (resourceType !== "all" && !resourceTypeOptions.includes(resourceType)) {
    resourceTypeOptions.push(resourceType)
    resourceTypeOptions.sort()
  }

  const resourceActivity = Array.from(
    items.reduce((accumulator, item) => {
      const current = accumulator.get(item.resourceType)

      accumulator.set(item.resourceType, {
        resourceType: item.resourceType,
        count: (current?.count ?? 0) + 1,
      })

      return accumulator
    }, new Map<string, { resourceType: string; count: number }>()),
  )
    .map(([, value]) => value)
    .sort((left, right) => right.count - left.count)

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load audit log</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total changes</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{summary?.total ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Create / Edit / Delete</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{summary?.editCount ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <PencilLine className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Last activity</p>
                <p className="mt-3 text-sm font-medium leading-6 text-foreground">{formatTimestamp(summary?.latestAt)}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <Clock3 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),300px]">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-lg">Change log</CardTitle>
                <CardDescription>
                  Create, update, and delete operations across Keycloak users, groups, connections, and templates.
                </CardDescription>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px,auto]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search resource, detail, or actor"
                    className="h-11 rounded-full bg-background pl-10"
                  />
                </div>

                <Select value={resourceType} onValueChange={setResourceType}>
                  <SelectTrigger className="h-11 rounded-full bg-background">
                    <SelectValue placeholder="Resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All resource types</SelectItem>
                    {resourceTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {getResourceTypeLabel(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  className="h-11 rounded-full bg-transparent px-5"
                  disabled={isExporting || isLoading}
                  onClick={() => void handleExportAll()}
                >
                  {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-3 h-4 w-4 animate-spin" />
                Loading change log...
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
                <Filter className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-base font-medium text-foreground">No changes recorded yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Changes to users, groups, templates, and connections will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">Change</TableHead>
                    <TableHead className="px-5">Resource</TableHead>
                    <TableHead className="px-5">Actor</TableHead>
                    <TableHead className="px-5">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-border">
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5">
                          <p className="font-medium text-foreground">{item.detail}</p>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
                            {getActionLabel(item.action)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1">
                          <p className="font-medium text-foreground">{item.resourceName}</p>
                          <p className="text-sm text-muted-foreground">{getResourceTypeLabel(item.resourceType)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal text-sm text-muted-foreground">
                        {item.actorName}
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal text-sm text-muted-foreground">
                        {formatTimestamp(item.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Active resources</CardTitle>
              <CardDescription>Top resource groups in the current audit window.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {resourceActivity.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No resource activity in the current filter.
                </div>
              ) : (
                resourceActivity.slice(0, 8).map((item) => (
                  <div key={item.resourceType} className="rounded-[1.25rem] border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground">
                          <Wrench className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">{getResourceTypeLabel(item.resourceType)}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.count}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
