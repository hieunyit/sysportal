"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { KeyRound, LoaderCircle, Plus, Search, ShieldAlert, ShieldCheck, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  OpenVpnUserEditorDialog,
  type EditableOpenVpnUserState,
} from "@/components/openvpn/openvpn-management-dialogs"
import { readApiErrorMessage, readApiSuccessMessage } from "@/lib/api-client"

interface OpenVpnUserListResponse {
  summary: {
    totalUsers: number
    adminUsers: number
    deniedUsers: number
    autologinUsers: number
  }
  items: Array<{
    name: string
    group: string | null
    authMethod: string | null
    admin: boolean
    autologin: boolean
    denied: boolean
    denyWeb: boolean
    mfaStatus: string | null
    passwordDefined: boolean
    staticIpv4: string | null
    staticIpv6: string | null
  }>
  total: number
  page: number
  pageSize: number
  pageCount: number
  search: string
}

const defaultCreateState: EditableOpenVpnUserState = {
  name: "",
  group: "",
  auth_method: "",
  admin: false,
  autologin: false,
  deny: false,
  deny_web: false,
  totp: false,
  allow_password_change: false,
  allow_generate_profiles: false,
  static_ipv4: "",
  static_ipv6: "",
  cc_commands: "",
}

function renderPolicyBadges(item: OpenVpnUserListResponse["items"][number]) {
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
      {item.passwordDefined ? (
        <Badge variant="outline" className="rounded-sm">
          Password
        </Badge>
      ) : null}
      {item.mfaStatus ? (
        <Badge variant="outline" className="rounded-sm">
          MFA {item.mfaStatus}
        </Badge>
      ) : null}
    </div>
  )
}

export function OpenVpnUsersContent() {
  const router = useRouter()
  const [data, setData] = useState<OpenVpnUserListResponse | null>(null)
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

    async function loadUsers() {
      try {
        setIsLoading(true)
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        })

        if (deferredSearch.trim()) {
          params.set("search", deferredSearch.trim())
        }

        const response = await fetch(`/api/openvpn/users?${params.toString()}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readApiErrorMessage(payload, "Unable to load OpenVPN users"))
        }

        if (!isActive) {
          return
        }

        setData(payload as OpenVpnUserListResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load OpenVPN users")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadUsers()

    return () => {
      isActive = false
    }
  }, [deferredSearch, page, refreshKey])

  async function handleCreateUser(payload: EditableOpenVpnUserState) {
    try {
      setIsCreating(true)
      const response = await fetch("/api/openvpn/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responsePayload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readApiErrorMessage(responsePayload, "Unable to create OpenVPN user"))
      }

      setIsCreateOpen(false)
      setRefreshKey((current) => current + 1)
      toast.success("OpenVPN user created", {
        description: readApiSuccessMessage(responsePayload, `User ${payload.name} was created.`),
      })
      router.push(`/openvpn/users/${encodeURIComponent(payload.name)}`)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load OpenVPN users</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/92">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Total users</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.totalUsers ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <UserRound className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/92">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Admin UI</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.adminUsers ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/92">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Autologin</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.autologinUsers ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/92">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Denied</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.deniedUsers ?? 0}</p>
                <p className="mt-1 text-xs text-muted-foreground">Explicit deny profiles</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/92">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">OpenVPN users</CardTitle>
              <CardDescription>Browse user profiles and direct policy state.</CardDescription>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
              <div className="relative w-full lg:min-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search username or primary group"
                  className="h-11 pl-10"
                />
              </div>
              <Button className="h-11 px-5" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create user
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
            <LoaderCircle className="mr-3 h-4 w-4 animate-spin" />
            Loading OpenVPN users...
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="flex flex-col gap-2 border-b border-border bg-muted/10 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>{data.total} records in scope.</p>
              <p>
                Page {data.page} of {data.pageCount}
              </p>
            </div>

            <Table className="[&_td]:py-3">
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="px-4">User</TableHead>
                  <TableHead>Primary group</TableHead>
                  <TableHead>Authentication</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Static address</TableHead>
                  <TableHead className="px-4 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((item) => (
                  <TableRow key={item.name} className="border-border">
                    <TableCell className="px-4">
                      <div className="space-y-1">
                        <div className="font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.denyWeb ? "Client web access denied" : "Client web access allowed"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{item.group ?? <span className="text-muted-foreground">Inherited / none</span>}</TableCell>
                    <TableCell>{item.authMethod ?? <span className="text-muted-foreground">Inherited</span>}</TableCell>
                    <TableCell>{renderPolicyBadges(item)}</TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div>{item.staticIpv4 ?? "-"}</div>
                        <div className="text-muted-foreground">{item.staticIpv6 ?? "-"}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 text-right">
                      <Button asChild variant="outline" size="sm" className="bg-transparent px-4">
                        <Link href={`/openvpn/users/${encodeURIComponent(item.name)}`}>View detail</Link>
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
                  <Button variant="outline" size="sm" className="bg-transparent" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-transparent"
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
            <p className="text-base font-medium text-foreground">No OpenVPN users found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Create the first local user profile or refine the search criteria.
            </p>
          </div>
        )}
        </CardContent>
      </Card>

      <OpenVpnUserEditorDialog
        mode="create"
        open={isCreateOpen}
        pending={isCreating}
        value={defaultCreateState}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateUser}
      />
    </div>
  )
}
