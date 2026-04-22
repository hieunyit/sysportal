"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircle, Plus, Search, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  OpenVpnConsoleShell,
  OpenVpnPanel,
} from "@/components/openvpn/openvpn-console-shell"
import {
  OpenVpnGroupEditorDialog,
  type EditableOpenVpnGroupState,
} from "@/components/openvpn/openvpn-management-dialogs"

interface OpenVpnGroupListResponse {
  summary: {
    totalGroups: number
    adminGroups: number
    deniedGroups: number
    groupsWithMembers: number
  }
  items: Array<{
    name: string
    authMethod: string | null
    admin: boolean
    autologin: boolean
    denied: boolean
    denyWeb: boolean
    memberCount: number
    subnetCount: number
    dynamicRangeCount: number
  }>
  total: number
  page: number
  pageSize: number
  pageCount: number
  search: string
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as {
    detail?: string
    error?: string
    issues?: Array<{ path?: string; message?: string }>
  }
  const issues = response.issues
    ?.map((issue) => {
      const path = issue.path?.trim()
      const message = issue.message?.trim()
      return path ? `${path}: ${message}` : message
    })
    .filter(Boolean)
    .join("; ")

  return response.detail ?? issues ?? response.error ?? fallback
}

const defaultCreateState: EditableOpenVpnGroupState = {
  name: "",
  auth_method: "",
  admin: false,
  autologin: false,
  deny: false,
  deny_web: false,
  totp: false,
  allow_password_change: false,
  allow_generate_profiles: false,
  cc_commands: "",
}

function renderPolicyBadges(item: OpenVpnGroupListResponse["items"][number]) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={item.denied ? "destructive" : "outline"} className="rounded-sm">
        {item.denied ? "Denied" : "Allowed"}
      </Badge>
      {item.admin ? (
        <Badge variant="secondary" className="rounded-sm">
          Admin UI
        </Badge>
      ) : null}
      {item.autologin ? (
        <Badge variant="outline" className="rounded-sm">
          Autologin
        </Badge>
      ) : null}
      {item.denyWeb ? (
        <Badge variant="outline" className="rounded-sm">
          Web denied
        </Badge>
      ) : null}
    </div>
  )
}

export function OpenVpnGroupsContent() {
  const router = useRouter()
  const [data, setData] = useState<OpenVpnGroupListResponse | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isActive = true

    async function loadGroups() {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        })

        if (deferredSearch.trim()) {
          params.set("search", deferredSearch.trim())
        }

        const response = await fetch(`/api/openvpn/groups?${params.toString()}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load OpenVPN groups"))
        }

        if (!isActive) {
          return
        }

        setData(payload as OpenVpnGroupListResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load OpenVPN groups")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadGroups()

    return () => {
      isActive = false
    }
  }, [deferredSearch, page, refreshKey])

  async function handleCreateGroup(payload: EditableOpenVpnGroupState) {
    try {
      setIsCreating(true)
      const response = await fetch("/api/openvpn/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responsePayload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readErrorMessage(responsePayload, "Unable to create OpenVPN group"))
      }

      setIsCreateOpen(false)
      setRefreshKey((current) => current + 1)
      router.push(`/openvpn/groups/${encodeURIComponent(payload.name)}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <OpenVpnConsoleShell
      title="Group Permissions"
      description="Review shared OpenVPN policy containers, member counts, and the group-level rules that sit between global policy and user overrides."
      context="Access Controls / Group Directory"
      metrics={[
        {
          label: "Total groups",
          value: data?.summary.totalGroups ?? "-",
          helper: "Groups returned by Access Server",
        },
        {
          label: "Admin UI",
          value: data?.summary.adminGroups ?? "-",
          helper: "Groups with admin capability",
        },
        {
          label: "With members",
          value: data?.summary.groupsWithMembers ?? "-",
          helper: "Groups currently holding members",
        },
        {
          label: "Denied",
          value: data?.summary.deniedGroups ?? "-",
          helper: "Explicitly blocked groups",
          tone: (data?.summary.deniedGroups ?? 0) > 0 ? "warning" : "neutral",
        },
      ]}
      actions={
        <>
          <div className="relative min-w-[18rem] xl:min-w-[22rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search group name"
              className="h-10 rounded-lg border-slate-300 bg-white pl-9 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
          <Button className="h-10 rounded-lg px-4" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create group
          </Button>
        </>
      }
    >
      {error ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load OpenVPN groups</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <OpenVpnPanel
        title="Shared policy groups"
        description="Open a group to edit profile properties, IPv4 or IPv6 access lists, and assigned domain rulesets."
        bodyClassName="p-0"
      >
        {isLoading ? (
          <div className="flex min-h-[360px] items-center justify-center bg-muted/10">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading OpenVPN groups...
            </div>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="flex flex-col gap-2 border-b border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>Search, inspect, and drill into group-level access controls.</p>
              <p>
                {data.total} record{data.total === 1 ? "" : "s"} / page {data.page} of {data.pageCount}
              </p>
            </div>

            <Table className="[&_td]:py-3">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Group
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Authentication
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Members
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Network space
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Policy
                  </TableHead>
                  <TableHead className="px-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Open
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell className="px-4">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.subnetCount} subnet rule{item.subnetCount === 1 ? "" : "s"} / {item.dynamicRangeCount} dynamic range
                          {item.dynamicRangeCount === 1 ? "" : "s"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.authMethod ?? <span className="text-muted-foreground">Inherited</span>}</TableCell>
                    <TableCell>{item.memberCount}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>{item.subnetCount} subnets</div>
                        <div className="text-muted-foreground">{item.dynamicRangeCount} dynamic ranges</div>
                      </div>
                    </TableCell>
                    <TableCell>{renderPolicyBadges(item)}</TableCell>
                    <TableCell className="px-4 text-right">
                      <Button asChild variant="outline" size="sm" className="rounded-lg bg-transparent">
                        <Link href={`/openvpn/groups/${encodeURIComponent(item.name)}`}>Open</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data.pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted-foreground">
                <p>
                  Showing page {data.page} of {data.pageCount}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.pageCount}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="px-4 py-16 text-center">
            <p className="text-base font-medium text-foreground">No OpenVPN groups found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first shared VPN group or refine the search criteria.
            </p>
          </div>
        )}
      </OpenVpnPanel>

      <OpenVpnGroupEditorDialog
        mode="create"
        open={isCreateOpen}
        pending={isCreating}
        value={defaultCreateState}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateGroup}
      />
    </OpenVpnConsoleShell>
  )
}
