"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, FolderTree, LoaderCircle, Pencil, Plus, ShieldAlert, Trash2, Users, Workflow } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTimestamp } from "@/lib/email-template-utils"
import { GroupEditorDialog, GroupMemberDialog } from "@/components/keycloak/group-management-dialogs"

interface GroupDetailResponse {
  summary: {
    realm: string
    displayName: string | null
  }
  group: {
    id: string
    name: string
    path: string
    description: string | null
    parentId: string | null
    parentPath: string | null
    depth: number
    subGroupCount: number
    attributes: Record<string, string[]>
    realmRoles: string[]
    clientRoles: Record<string, string[]>
  }
  ancestry: Array<{
    id: string
    name: string
    path: string
  }>
  subGroups: Array<{
    id: string
    name: string
    path: string
    description: string | null
    subGroupCount: number
  }>
  members: Array<{
    id: string
    username: string
    displayName: string
    email: string
    enabled: boolean
    emailVerified: boolean
    createdAt: string | null
    requiredActions: string[]
  }>
  roleMappings: {
    realmMappings?: Array<{ id?: string; name?: string }>
    clientMappings?: Record<
      string,
      {
        client?: string
        mappings?: Array<{ id?: string; name?: string }>
      }
    >
  }
  adminEvents: Array<{
    id: string
    occurredAt: string | null
    operationType: string | null
    resourceType: string | null
    resourcePath: string | null
    actorUserId: string | null
    actorUsername: string | null
    clientId: string | null
    ipAddress: string | null
    error: string | null
    details: Record<string, string>
  }>
  warnings: string[]
}

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as { detail?: string; error?: string }
  return response.detail ?? response.error ?? fallback
}

export function GroupDetailContent({ groupId }: { groupId: string }) {
  const [data, setData] = useState<GroupDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error"
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadGroup() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/keycloak/groups/${groupId}`, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load Keycloak group detail"))
        }

        if (!isActive) {
          return
        }

        setData(payload as GroupDetailResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load Keycloak group detail")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadGroup()

    return () => {
      isActive = false
    }
  }, [groupId, refreshKey])

  async function runMutation(label: string, path: string, options?: RequestInit) {
    try {
      setPendingAction(label)
      setFeedback(null)

      const response = await fetch(path, options)
      const payload = response.status === 204 ? null : await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, `Unable to ${label.toLowerCase()}`))
      }

      setFeedback({
        tone: "success",
        message: label,
      })
      setRefreshKey((current) => current + 1)
    } catch (mutationError) {
      setFeedback({
        tone: "error",
        message:
          mutationError instanceof Error ? mutationError.message : `Unable to ${label.toLowerCase()}`,
      })
      throw mutationError
    } finally {
      setPendingAction(null)
    }
  }

  async function handleEditGroup(payload: { name: string; description: string }) {
    await runMutation(`Group ${payload.name} updated`, `/api/keycloak/groups/${groupId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    setIsEditOpen(false)
  }

  async function handleAddMember(payload: { userId: string }) {
    await runMutation("Group member added", `/api/keycloak/groups/${groupId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    setIsAddMemberOpen(false)
  }

  async function handleRemoveMember(userId: string) {
    await runMutation("Group member removed", `/api/keycloak/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading Keycloak group detail...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Group detail unavailable</h2>
            <p className="text-sm leading-6 text-muted-foreground">{error ?? "The requested group could not be loaded."}</p>
          </div>
          <Button asChild variant="outline" className="rounded-lg px-5">
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4" />
              Back to groups
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const realmRoleCount = data.roleMappings.realmMappings?.length ?? 0
  const clientRoleCount = Object.values(data.roleMappings.clientMappings ?? {}).reduce(
    (total, mapping) => total + (mapping.mappings?.length ?? 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-0">
        <div className="min-w-0 flex-1 space-y-6 md:pr-6">
          <div className="space-y-4 px-1">
            <Button asChild variant="ghost" className="h-8 rounded-xl px-3 text-muted-foreground">
              <Link href="/groups">
                <ArrowLeft className="h-4 w-4" />
                Back to groups
              </Link>
            </Button>

            <h2 className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">{data.group.name}</h2>

            <div className="grid gap-3 xl:grid-cols-3">
              <div className="rounded-md border border-border/70 bg-card/92 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Path</p>
                <p className="mt-2 text-sm font-medium text-foreground">{data.group.path}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/92 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Realm</p>
                <p className="mt-2 text-sm font-medium text-foreground">{data.summary.realm}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/92 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Description</p>
                <p className="mt-2 text-sm font-medium text-foreground">{data.group.description || "No description"}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/92 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Members</p>
                <p className="mt-2 text-sm font-medium text-foreground">{data.members.length}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/92 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subgroups</p>
                <p className="mt-2 text-sm font-medium text-foreground">{data.group.subGroupCount}</p>
              </div>
              <div className="rounded-md border border-border/70 bg-card/92 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Depth</p>
                <p className="mt-2 text-sm font-medium text-foreground">{data.group.depth}</p>
              </div>
            </div>
          </div>

          {feedback ? (
            <Alert variant={feedback.tone === "error" ? "destructive" : "default"}>
              <AlertTitle>{feedback.tone === "error" ? "Action failed" : "Action completed"}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          ) : null}

          {data.warnings.length > 0 ? (
            <Alert>
              <AlertTitle>Some group activity sections are limited</AlertTitle>
              <AlertDescription>{data.warnings.join(" ")}</AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-md border border-border/70 bg-card/92 p-1">
            <TabsTrigger value="overview" className="h-11 rounded-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="access" className="h-11 rounded-sm">
              Access
            </TabsTrigger>
            <TabsTrigger value="activity" className="h-11 rounded-sm">
              Activity
            </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
            <Card className="border-border/70 bg-card/92 shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Group structure</CardTitle>
                    <CardDescription>Hierarchy, subgroups, and attributes without the long vertical stack.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 xl:grid-cols-[0.9fr,1fr,1.1fr]">
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Ancestry</p>
                  {data.ancestry.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">This is a top-level group.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {data.ancestry.map((group) => (
                        <div key={group.id} className="rounded-[0.9rem] border border-border bg-card p-3">
                          <p className="font-medium text-foreground">{group.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{group.path}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subgroups</p>
                  {data.subGroups.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No direct subgroups were returned.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {data.subGroups.map((group) => (
                        <div key={group.id} className="rounded-[0.9rem] border border-border bg-card p-3">
                          <p className="font-medium text-foreground">{group.name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{group.path}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Attributes</p>
                  {Object.keys(data.group.attributes).length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No custom attributes were returned.</p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                      {Object.entries(data.group.attributes).map(([key, values]) => (
                        <div key={key} className="rounded-[0.9rem] border border-border bg-card p-3">
                          <p className="font-medium text-foreground">{key}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{values.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            <TabsContent value="access" className="space-y-6">
          <Card className="border-border/70 bg-card/92 shadow-none">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Role mappings</CardTitle>
                  <CardDescription>Realm and client roles.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Realm roles</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(data.roleMappings.realmMappings ?? []).length === 0 ? (
                    <span className="text-sm text-muted-foreground">No realm roles were returned.</span>
                  ) : (
                    (data.roleMappings.realmMappings ?? []).map((role) => (
                      <Badge key={role.id ?? role.name} variant="outline" className="border-border bg-card text-muted-foreground">
                        {role.name ?? role.id}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-[1rem] border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Client role mappings</p>
                {Object.keys(data.roleMappings.clientMappings ?? {}).length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No client role mappings were returned.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {Object.entries(data.roleMappings.clientMappings ?? {}).map(([clientId, clientMapping]) => (
                      <div key={clientId} className="rounded-[0.9rem] border border-border bg-card p-3">
                        <p className="font-medium text-foreground">{clientMapping.client ?? clientId}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(clientMapping.mappings ?? []).map((role) => (
                            <Badge key={role.id ?? role.name} variant="outline" className="border-border bg-background text-muted-foreground">
                              {role.name ?? role.id}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/92 shadow-none">
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">Group members</CardTitle>
                  <CardDescription>Current members.</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-lg bg-transparent px-5"
                  onClick={() => setIsAddMemberOpen(true)}
                  disabled={Boolean(pendingAction)}
                >
                  <Plus className="h-4 w-4" />
                  Add member
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="px-5">User</TableHead>
                    <TableHead className="px-5">Status</TableHead>
                    <TableHead className="px-5">Created</TableHead>
                    <TableHead className="px-5">Required actions</TableHead>
                    <TableHead className="px-5 text-right">Manage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.members.length === 0 ? (
                    <TableRow className="border-border">
                      <TableCell colSpan={5} className="px-5 py-6 text-center text-sm text-muted-foreground">
                        No members were returned for this group.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.members.map((member) => (
                      <TableRow key={member.id} className="border-border">
                        <TableCell className="px-5 py-4 align-top whitespace-normal">
                          <div className="space-y-1.5">
                            <p className="font-medium text-foreground">{member.displayName || member.username}</p>
                            <p className="text-sm text-muted-foreground">{member.username}</p>
                            <p className="text-sm text-muted-foreground">{member.email || "No email address"}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 align-top">
                          <Badge
                            variant="outline"
                            className={
                              member.enabled
                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                            }
                          >
                            {member.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-5 py-4 align-top">{formatTimestamp(member.createdAt)}</TableCell>
                        <TableCell className="px-5 py-4 align-top whitespace-normal">
                          <div className="flex flex-wrap gap-2">
                            {member.requiredActions.length === 0 ? (
                              <span className="text-sm text-muted-foreground">None</span>
                            ) : (
                              member.requiredActions.map((action) => (
                                <Badge key={action} variant="outline" className="border-border bg-background text-muted-foreground">
                                  {action}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-5 py-4 text-right align-top">
                          <div className="flex justify-end gap-2">
                            <Button asChild variant="outline" className="rounded-lg bg-transparent px-4">
                              <Link href={`/users/${member.id}`}>Open user</Link>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              className="rounded-lg px-3 text-rose-600 hover:text-rose-600 dark:text-rose-300"
                              onClick={() => {
                                void handleRemoveMember(member.id).catch(() => undefined)
                              }}
                              disabled={Boolean(pendingAction)}
                            >
                              {pendingAction === "Group member removed" ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

            <TabsContent value="activity">
            <Card className="border-border/70 bg-card/92 shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Admin activity</CardTitle>
                    <CardDescription>Recent admin events.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[680px] pr-4">
                  <div className="space-y-4">
                    {data.adminEvents.length === 0 ? (
                      <div className="rounded-[1.25rem] border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                        No admin events were returned for this group.
                      </div>
                    ) : (
                      data.adminEvents.map((event) => (
                        <div key={event.id} className="rounded-[1.25rem] border border-border bg-background p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{event.operationType ?? "Unknown operation"}</p>
                            {event.resourceType ? (
                              <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                                {event.resourceType}
                              </Badge>
                            ) : null}
                            {event.error ? (
                              <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                                Error
                              </Badge>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span>{formatTimestamp(event.occurredAt)}</span>
                            {event.actorUsername ? <span>Actor {event.actorUsername}</span> : null}
                            {event.ipAddress ? <span>IP {event.ipAddress}</span> : null}
                            {event.resourcePath ? <span>{event.resourcePath}</span> : null}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="md:w-80 md:shrink-0 md:self-stretch md:border-l md:border-border/70 md:bg-card/30">
          <div className="rounded-sm border border-border/70 bg-card/92 p-4 md:sticky md:top-6 md:rounded-none md:border-0 md:bg-transparent md:p-6">
            <div className="space-y-1 pb-4">
              <h3 className="text-lg font-semibold text-foreground">Actions</h3>
              <p className="text-sm text-muted-foreground">Direct group controls.</p>
            </div>
            <div className="grid gap-2">
              <Button type="button" className="h-10 justify-start rounded-sm px-4" onClick={() => setIsEditOpen(true)} disabled={Boolean(pendingAction)}>
                <Pencil className="h-4 w-4" />
                Edit group
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 justify-start rounded-sm bg-transparent px-4"
                onClick={() => setIsAddMemberOpen(true)}
                disabled={Boolean(pendingAction)}
              >
                <Plus className="h-4 w-4" />
                Add member
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <GroupEditorDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        initialValue={{
          name: data.group.name,
          description: data.group.description ?? "",
        }}
        isSubmitting={Boolean(pendingAction)}
        onSubmit={handleEditGroup}
      />

      <GroupMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        isSubmitting={pendingAction === "Group member added"}
        onSubmit={handleAddMember}
      />
    </div>
  )
}


