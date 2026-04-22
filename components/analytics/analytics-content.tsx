"use client"

import { useDeferredValue, useEffect, useState } from "react"
import { Activity, Clock3, Filter, LoaderCircle, PencilLine, Search, ShieldCheck, Wrench } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
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
import { cn } from "@/lib/utils"

interface AuditSummary {
  total: number
  accessCount: number
  editCount: number
  actionCount: number
  latestAt: string | null
}

interface AuditItem {
  id: string
  actorName: string
  category: "access" | "edit" | "action"
  action: string
  resourceType: string
  resourceId: string
  resourceName: string
  detail: string
  createdAt: string
}

type CategoryFilter = "all" | AuditItem["category"]

const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All categories" },
  { value: "access", label: "Access" },
  { value: "edit", label: "Edit" },
  { value: "action", label: "Action" },
]

function getAuditCategoryClass(category: AuditItem["category"]) {
  switch (category) {
    case "access":
      return "border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-300"
    case "edit":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    case "action":
      return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
  }
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
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")
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

        if (category !== "all") {
          searchParams.set("category", category)
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

        const audit = payload as { summary: AuditSummary; items: AuditItem[] }
        setSummary(audit.summary)
        setItems(audit.items)
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
  }, [category, deferredSearch, resourceType])

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Total events</p>
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
                <p className="text-sm text-muted-foreground">Access events</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{summary?.accessCount ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Configuration edits</p>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-lg">Platform-wide audit log</CardTitle>
                <CardDescription>
                  Review access, configuration, and operational events across connections, templates, and control
                  plane settings.
                </CardDescription>
              </div>

              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),220px,220px]">
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

                <Select value={category} onValueChange={(value) => setCategory(value as CategoryFilter)}>
                  <SelectTrigger className="h-11 rounded-full bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
                <LoaderCircle className="mr-3 h-4 w-4 animate-spin" />
                Loading audit events...
              </div>
            ) : items.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 text-center">
                <Filter className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-base font-medium text-foreground">No audit events match this filter</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Try broadening the current search or category filter.
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">Event</TableHead>
                    <TableHead className="px-5">Resource</TableHead>
                    <TableHead className="px-5">Category</TableHead>
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
                      <TableCell className="px-5 py-4 align-top">
                        <Badge variant="outline" className={cn("capitalize", getAuditCategoryClass(item.category))}>
                          {item.category}
                        </Badge>
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
              <CardTitle className="text-lg">Event mix</CardTitle>
              <CardDescription>Current distribution for the active filter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[1.25rem] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Access</span>
                  <span className="font-semibold text-foreground">{summary?.accessCount ?? 0}</span>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Edit</span>
                  <span className="font-semibold text-foreground">{summary?.editCount ?? 0}</span>
                </div>
              </div>
              <div className="rounded-[1.25rem] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">Action</span>
                  <span className="font-semibold text-foreground">{summary?.actionCount ?? 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

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
                resourceActivity.slice(0, 6).map((item) => (
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
