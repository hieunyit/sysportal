"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  LoaderCircle,
  ShieldBan,
  UserX,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { readApiErrorMessage, readApiSuccessMessage } from "@/lib/api-client"

const THRESHOLD_OPTIONS = [
  { value: "30", label: "30 days" },
  { value: "45", label: "45 days" },
  { value: "60", label: "60 days" },
  { value: "90", label: "90 days" },
]

interface StaleUser {
  id: string
  username: string
  displayName: string
  email: string | null
  enabled: boolean
  createdAt: string | null
}

interface StaleUsersResponse {
  items: StaleUser[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  thresholdDays: number
  thresholdDate: string
}

export function StaleUsersContent() {
  const [data, setData] = useState<StaleUsersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [days, setDays] = useState("45")
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isBulkWorking, setIsBulkWorking] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    setIsLoading(true)
    setError(null)
    setSelected(new Set())

    const params = new URLSearchParams({ days, page: String(page), pageSize: "20" })
    fetch(`/api/keycloak/users/stale?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((payload: unknown) => {
        if (!active) return
        const p = payload as { ok?: boolean; data?: StaleUsersResponse; error?: string }
        if (p.ok && p.data) setData(p.data)
        else setError((p as { error?: string }).error ?? "Unable to load stale accounts")
      })
      .catch(() => { if (active) setError("Unable to load stale accounts") })
      .finally(() => { if (active) setIsLoading(false) })

    return () => { active = false }
  }, [days, page, refreshKey])

  const items = data?.items ?? []
  const allSelected = items.length > 0 && items.every((u) => selected.has(u.id))
  const someSelected = items.some((u) => selected.has(u.id)) && !allSelected

  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) items.forEach((u) => next.delete(u.id))
      else items.forEach((u) => next.add(u.id))
      return next
    })
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleBulkDisable() {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setIsBulkWorking(true)
    try {
      const response = await fetch("/api/keycloak/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", userIds: ids }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null
      if (!response.ok) throw new Error(readApiErrorMessage(payload, "Bulk disable failed"))
      toast.success("Accounts disabled", { description: readApiSuccessMessage(payload, `${ids.length} account(s) disabled.`) })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error("Bulk disable failed", { description: err instanceof Error ? err.message : "Unknown error" })
    } finally {
      setIsBulkWorking(false)
    }
  }

  async function handleDisableOne(userId: string, username: string) {
    try {
      const response = await fetch(`/api/keycloak/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string; error?: string } | null
      if (!response.ok) throw new Error(readApiErrorMessage(payload, "Disable failed"))
      toast.success("Account disabled", { description: `${username} has been disabled.` })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error("Disable failed", { description: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  const selectionCount = selected.size

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">No login in the last</span>
          <Select value={days} onValueChange={(v) => { setDays(v); setPage(1) }}>
            <SelectTrigger className="h-8 w-28 rounded-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {THRESHOLD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectionCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectionCount} selected</span>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 rounded-full bg-transparent text-xs text-rose-600 hover:text-rose-600 dark:text-rose-400"
              disabled={isBulkWorking}
              onClick={() => void handleBulkDisable()}
            >
              {isBulkWorking ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ShieldBan className="h-3.5 w-3.5" />}
              Disable selected
            </Button>
          </div>
        )}
      </div>

      {/* Stats */}
      {data && (
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-4 py-2.5 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <span>
            <span className="font-semibold">{data.total}</span> enabled account{data.total !== 1 ? "s" : ""} with no login in the last{" "}
            <span className="font-semibold">{data.thresholdDays} days</span>
          </span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unable to load</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border/70">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                  disabled={isLoading || items.length === 0}
                />
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead className="hidden lg:table-cell">Account created</TableHead>
              <TableHead className="w-32 text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">No stale accounts</p>
                    <p className="text-xs text-muted-foreground">All enabled users have logged in within the last {days} days.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              items.map((user) => (
                <TableRow key={user.id} className={selected.has(user.id) ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""}>
                  <TableCell className="pl-4">
                    <Checkbox
                      checked={selected.has(user.id)}
                      onCheckedChange={() => toggleRow(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-[11px] font-semibold uppercase text-muted-foreground shrink-0">
                        {(user.displayName || user.username).slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight">
                          {user.displayName || user.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {user.email ?? <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {user.createdAt ? formatTimestamp(user.createdAt) : <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 rounded-lg px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        onClick={() => void handleDisableOne(user.id, user.username)}
                      >
                        <ShieldBan className="h-3.5 w-3.5" />
                        Disable
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 rounded-lg px-2.5 text-xs" asChild>
                        <Link href={`/users/${user.id}`}>
                          View
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data && data.pageCount > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {data.page} of {data.pageCount} — {data.total} total</span>
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs bg-transparent"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-full px-3 text-xs bg-transparent"
              disabled={page >= data.pageCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
