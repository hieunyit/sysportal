"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import { ArrowRight, FolderTree, LoaderCircle, Plus, Search, ShieldCheck, Users } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GroupEditorDialog } from "@/components/keycloak/group-management-dialogs"

interface GroupListItem {
  id: string
  name: string
  path: string
  description: string | null
  parentId: string | null
  parentPath: string | null
  depth: number
  subGroupCount: number
  attributeCount: number
  realmRoleCount: number
  clientRoleCount: number
}

interface GroupsResponse {
  summary: {
    realm: string
    displayName: string | null
    totalGroups: number
    topLevelGroups: number
    nestedGroups: number
  }
  items: GroupListItem[]
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

  const response = payload as { detail?: string; error?: string }
  return response.detail ?? response.error ?? fallback
}

export function GroupsContent() {
  const [data, setData] = useState<GroupsResponse | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isActive = true

    async function loadGroups() {
      try {
        setIsLoading(true)
        const searchParams = new URLSearchParams({
          page: String(page),
          pageSize: "18",
        })

        if (deferredSearch.trim()) {
          searchParams.set("search", deferredSearch.trim())
        }

        const response = await fetch(`/api/keycloak/groups?${searchParams.toString()}`, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load Keycloak groups"))
        }

        if (!isActive) {
          return
        }

        setData(payload as GroupsResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load Keycloak groups")
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

  async function handleCreateGroup(payload: { name: string; description: string }) {
    try {
      setIsSubmitting(true)
      setError(null)
      const response = await fetch("/api/keycloak/groups", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responsePayload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readErrorMessage(responsePayload, "Unable to create Keycloak group"))
      }

      setFeedback(`Group ${payload.name} created`)
      setIsCreateOpen(false)
      setRefreshKey((current) => current + 1)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create Keycloak group")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {feedback ? (
        <Alert>
          <AlertTitle>Group action completed</AlertTitle>
          <AlertDescription>{feedback}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load Keycloak groups</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">All groups</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.totalGroups ?? 0}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <FolderTree className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Top-level groups</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.topLevelGroups ?? 0}</p>
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
                <p className="text-sm text-muted-foreground">Nested groups</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.summary.nestedGroups ?? 0}</p>
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
                <p className="text-sm text-muted-foreground">Current filter</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.total ?? 0}</p>
                <p className="mt-2 text-xs text-muted-foreground">{data?.summary.realm ?? "Keycloak realm"}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <FolderTree className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-lg">Realm group hierarchy</CardTitle>
              <CardDescription>Flattened group hierarchy from Keycloak with paths, depth, subgroup counts, and mapped roles.</CardDescription>
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
                  placeholder="Search by group name or path"
                  className="h-11 rounded-full bg-background pl-10"
                />
              </div>
              <Button className="h-11 rounded-full px-5" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create group
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
              <LoaderCircle className="mr-3 h-4 w-4 animate-spin" />
              Loading Keycloak groups...
            </div>
          ) : !data || data.items.length === 0 ? (
            <Empty className="m-6 rounded-[1.5rem] border border-dashed border-border bg-background">
              <EmptyMedia variant="icon">
                <FolderTree />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No groups found</EmptyTitle>
                <EmptyDescription>The current Keycloak search did not return any groups for this realm.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">Group path</TableHead>
                    <TableHead className="px-5">Structure</TableHead>
                    <TableHead className="px-5">Mappings</TableHead>
                    <TableHead className="px-5 text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((group) => (
                    <TableRow key={group.id} className="border-border">
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5">
                          <p className="font-medium text-foreground" style={{ paddingLeft: `${group.depth * 12}px` }}>
                            {group.name}
                          </p>
                          <p className="text-sm text-muted-foreground">{group.path}</p>
                          {group.description ? (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            Depth {group.depth}
                          </Badge>
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            {group.subGroupCount} subgroups
                          </Badge>
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            {group.attributeCount} attributes
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            {group.realmRoleCount} realm roles
                          </Badge>
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            {group.clientRoleCount} client roles
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right align-top">
                        <Button asChild variant="outline" className="rounded-full bg-transparent px-4">
                          <Link href={`/groups/${group.id}`}>
                            View detail
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-4 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {data.page} of {data.pageCount} · {data.total} matching groups
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

      <GroupEditorDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        mode="create"
        isSubmitting={isSubmitting}
        onSubmit={handleCreateGroup}
      />
    </div>
  )
}
