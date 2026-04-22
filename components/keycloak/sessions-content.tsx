"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  RefreshCcw,
  Search,
  ShieldAlert,
  Users,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatTimestamp } from "@/lib/email-template-utils"

interface SessionRow {
  id: string
  userId: string
  username: string
  displayName: string
  email: string
  enabled: boolean
  emailVerified: boolean
  federationLink: string | null
  ipAddress: string | null
  startAt: string | null
  lastAccessAt: string | null
  rememberMe: boolean
  clients: string[]
  transientUser: boolean
  recentLoginFailures: number
}

interface FailedLoginAlertRow {
  key: string
  userId: string | null
  username: string
  displayName: string
  email: string
  failureCount: number
  lastFailedAt: string | null
  lastIpAddress: string | null
  ipAddresses: string[]
  lastError: string | null
  bruteForceDisabled: boolean | null
  bruteForceFailureCount: number | null
}

interface SessionsResponse {
  summary: {
    realm: string
    displayName: string | null
    bruteForceProtected: boolean
    activeSessions: number
    activeUsers: number
    monitoredUsers: number
    failedLoginThreshold: number
    failedLoginLookbackHours: number
    repeatedLoginAlerts: number
    topClients: Array<{
      clientId: string
      count: number
    }>
  }
  alerts: FailedLoginAlertRow[]
  items: SessionRow[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  search: string
  warnings: string[]
  generatedAt: string
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as { detail?: string; error?: string }
  return response.detail ?? response.error ?? fallback
}

function getSessionRiskTone(failureCount: number, threshold: number) {
  if (failureCount >= threshold) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
  }

  if (failureCount > 0) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
}

export function SessionsContent() {
  const [data, setData] = useState<SessionsResponse | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRefreshKey((current) => current + 1)
    }, 60_000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadSessions() {
      try {
        setIsLoading(true)
        const searchParams = new URLSearchParams({
          page: String(page),
          pageSize: "15",
        })

        if (deferredSearch.trim()) {
          searchParams.set("search", deferredSearch.trim())
        }

        const response = await fetch(`/api/keycloak/sessions?${searchParams.toString()}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load Keycloak sessions"))
        }

        if (!isActive) {
          return
        }

        setData(payload as SessionsResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load Keycloak sessions")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSessions()

    return () => {
      isActive = false
    }
  }, [deferredSearch, page, refreshKey])

  const threshold = data?.summary.failedLoginThreshold ?? 5

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load Keycloak sessions</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Active sessions</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.activeSessions ?? 0}
                </p>
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
                <p className="text-sm text-muted-foreground">Signed-in users</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.activeUsers ?? 0}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Repeated login alerts</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.repeatedLoginAlerts ?? 0}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Threshold {threshold} failed attempts
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Brute-force protection</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.bruteForceProtected ? "On" : "Off"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">{data?.summary.realm ?? "Keycloak realm"}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                {data?.summary.bruteForceProtected ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <AlertTriangle className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {data?.warnings.map((warning) => (
        <Alert key={warning}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Login protection warning</AlertTitle>
          <AlertDescription>{warning}</AlertDescription>
        </Alert>
      ))}

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-lg">Repeated login failures</CardTitle>
              <CardDescription>
                Accounts listed here hit at least {threshold} failed sign-in attempts in the last{" "}
                {data?.summary.failedLoginLookbackHours ?? 24} hours.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                Auto-refresh every 60s
              </Badge>
              <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                Updated {formatTimestamp(data?.generatedAt ?? null)}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && !data ? (
            <div className="flex min-h-[220px] items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-3 h-4 w-4 animate-spin" />
              Loading repeated login failures...
            </div>
          ) : !data || data.alerts.length === 0 ? (
            <Empty className="m-6 rounded-[1.5rem] border border-dashed border-border bg-background">
              <EmptyMedia variant="icon">
                <CheckCircle2 />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No repeated login failures</EmptyTitle>
                <EmptyDescription>
                  No account has crossed the configured failed-login threshold in the current lookback window.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/35">
                  <TableHead className="px-5">User</TableHead>
                  <TableHead className="px-5">Failed attempts</TableHead>
                  <TableHead className="px-5">Last source</TableHead>
                  <TableHead className="px-5">Last activity</TableHead>
                  <TableHead className="px-5">Protection status</TableHead>
                  <TableHead className="px-5 text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.alerts.map((alert) => (
                  <TableRow key={alert.key} className="border-border">
                    <TableCell className="px-5 py-4 align-top whitespace-normal">
                      <div className="space-y-1.5">
                        <p className="font-medium text-foreground">{alert.displayName}</p>
                        <p className="text-sm text-muted-foreground">{alert.username || "Unknown username"}</p>
                        <p className="text-sm text-muted-foreground">{alert.email || "No email address"}</p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top">
                      <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                        {alert.failureCount} failures
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top whitespace-normal">
                      <div className="space-y-1.5 text-sm text-muted-foreground">
                        <p>{alert.lastIpAddress ?? "IP not available"}</p>
                        <p>{alert.ipAddresses.length} unique source IP(s)</p>
                        {alert.lastError ? <p className="text-xs">{alert.lastError}</p> : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top whitespace-normal">
                      <p className="text-sm text-foreground">{formatTimestamp(alert.lastFailedAt)}</p>
                    </TableCell>
                    <TableCell className="px-5 py-4 align-top whitespace-normal">
                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className={
                            alert.bruteForceDisabled
                              ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                              : "border-border bg-background text-muted-foreground"
                          }
                        >
                          {alert.bruteForceDisabled ? "Temporarily disabled" : "Observed only"}
                        </Badge>
                        {typeof alert.bruteForceFailureCount === "number" ? (
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            Brute-force count {alert.bruteForceFailureCount}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right align-top">
                      {alert.userId ? (
                        <Button asChild variant="outline" className="rounded-full bg-transparent px-4">
                          <Link href={`/users/${alert.userId}`}>Manage user</Link>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">No user record</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="text-lg">Active user sessions</CardTitle>
              <CardDescription>
                Review the current signed-in sessions for the configured Keycloak realm and trace the clients each user is accessing.
              </CardDescription>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row xl:items-center">
              <div className="relative w-full sm:min-w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by user, email, IP, or client"
                  className="h-11 rounded-full bg-background pl-10"
                />
              </div>

              <Button
                variant="outline"
                className="h-11 rounded-full bg-transparent px-5"
                onClick={() => {
                  setRefreshKey((current) => current + 1)
                }}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && !data ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-3 h-4 w-4 animate-spin" />
              Loading active Keycloak sessions...
            </div>
          ) : !data || data.items.length === 0 ? (
            <Empty className="m-6 rounded-[1.5rem] border border-dashed border-border bg-background">
              <EmptyMedia variant="icon">
                <Activity />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No active sessions found</EmptyTitle>
                <EmptyDescription>
                  There are currently no matching sessions in the configured Keycloak realm.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 px-5 py-4">
                {data.summary.topClients.map((client) => (
                  <Badge key={client.clientId} variant="outline" className="border-border bg-background text-muted-foreground">
                    {client.clientId} · {client.count}
                  </Badge>
                ))}
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">User</TableHead>
                    <TableHead className="px-5">Source</TableHead>
                    <TableHead className="px-5">Clients</TableHead>
                    <TableHead className="px-5">Activity</TableHead>
                    <TableHead className="px-5">Signals</TableHead>
                    <TableHead className="px-5 text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((session) => (
                    <TableRow key={session.id} className="border-border">
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5">
                          <p className="font-medium text-foreground">{session.displayName}</p>
                          <p className="text-sm text-muted-foreground">{session.username}</p>
                          <p className="text-sm text-muted-foreground">{session.email || "No email address"}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <p>{session.ipAddress ?? "IP not available"}</p>
                          <p>Session {session.id.slice(0, 8)}</p>
                          {session.rememberMe ? <p>Remember me enabled</p> : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="flex flex-wrap gap-2">
                          {session.clients.length === 0 ? (
                            <span className="text-sm text-muted-foreground">No client sessions</span>
                          ) : (
                            session.clients.map((client) => (
                              <Badge key={client} variant="outline" className="border-border bg-background text-muted-foreground">
                                {client}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>Started {formatTimestamp(session.startAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span>Last access {formatTimestamp(session.lastAccessAt)}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="flex flex-wrap gap-2">
                          <Badge
                            variant="outline"
                            className={getSessionRiskTone(session.recentLoginFailures, threshold)}
                          >
                            {session.recentLoginFailures > 0
                              ? `${session.recentLoginFailures} recent failures`
                              : "No recent failures"}
                          </Badge>
                          {!session.enabled ? (
                            <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                              Disabled account
                            </Badge>
                          ) : null}
                          {session.transientUser ? (
                            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                              Transient session
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right align-top">
                        <Button asChild variant="outline" className="rounded-full bg-transparent px-4">
                          <Link href={`/users/${session.userId}`}>Manage user</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.pageCount} · {data.total} matching sessions
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="rounded-full bg-transparent"
                    disabled={data.page <= 1}
                    onClick={() => setPage((current) => Math.max(current - 1, 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full bg-transparent"
                    disabled={data.page >= data.pageCount}
                    onClick={() => setPage((current) => Math.min(current + 1, data.pageCount))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
