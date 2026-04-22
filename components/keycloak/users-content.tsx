"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Plus,
  Search,
  ShieldAlert,
  Upload,
  Users,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatTimestamp } from "@/lib/email-template-utils"
import { UserImportDialog } from "@/components/keycloak/user-import-dialog"
import { UserEditorDialog } from "@/components/keycloak/user-management-dialogs"

interface UserListItem {
  id: string
  username: string
  displayName: string
  firstName: string
  lastName: string
  email: string
  enabled: boolean
  emailVerified: boolean
  federationLink: string | null
  createdAt: string | null
  requiredActions: string[]
  attributeCount: number
  passwordLastSetAt: string | null
  passwordTemporary: boolean
  credentialTypes: string[]
  groupCount: number
  groups: Array<{
    id: string
    name: string
    path: string
  }>
}

interface UsersResponse {
  summary: {
    realm: string
    displayName: string | null
    totalUsers: number
    enabledUsers: number
    emailVerifiedUsers: number
  }
  items: UserListItem[]
  total: number
  page: number
  pageSize: number
  pageCount: number
  search: string
}

interface CreateUserResultNotice {
  id: string
  username: string
  generatedPassword: string | null
  passwordSource: "provided" | "generated"
  temporaryPassword: boolean
  welcomeRecipientEmail: string | null
  defaultGroupAssignment:
    | {
        groupName: string
        assigned: boolean
        error: string | null
      }
    | null
  welcomeEmail:
    | {
        sent: boolean
        recipient: string
        error: string | null
      }
    | null
  userType: string
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
  const issueMessage = response.issues
    ?.map((issue) => {
      const path = issue.path?.trim()
      const message = issue.message?.trim()
      return path ? `${path}: ${message}` : message
    })
    .filter(Boolean)
    .join("; ")

  return response.detail ?? issueMessage ?? response.error ?? fallback
}

function getUserStatusClass(user: UserListItem) {
  if (!user.enabled) {
    return "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
  }

  if (!user.emailVerified) {
    return "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300"
  }

  return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
}

function getUserStatusLabel(user: UserListItem) {
  if (!user.enabled) {
    return "Disabled"
  }

  if (!user.emailVerified) {
    return "Pending email verification"
  }

  return "Active"
}

export function UsersContent() {
  const router = useRouter()
  const [data, setData] = useState<UsersResponse | null>(null)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createProfileMetadata, setCreateProfileMetadata] = useState<Record<string, unknown> | null>(null)
  const [isLoadingCreateMetadata, setIsLoadingCreateMetadata] = useState(false)
  const [createResult, setCreateResult] = useState<CreateUserResultNotice | null>(null)
  const [error, setError] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    let isActive = true

    async function loadUsers() {
      try {
        setIsLoading(true)
        const searchParams = new URLSearchParams({
          page: String(page),
          pageSize: "12",
        })

        if (deferredSearch.trim()) {
          searchParams.set("search", deferredSearch.trim())
        }

        const response = await fetch(`/api/keycloak/users?${searchParams.toString()}`, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load Keycloak users"))
        }

        if (!isActive) {
          return
        }

        setData(payload as UsersResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load Keycloak users")
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

  useEffect(() => {
    if (!isCreateOpen) {
      return
    }

    let isActive = true

    async function loadCreateMetadata() {
      try {
        setIsLoadingCreateMetadata(true)
        const response = await fetch("/api/keycloak/users/profile/metadata", {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load Keycloak user profile metadata"))
        }

        if (!isActive) {
          return
        }

        setCreateProfileMetadata((payload as { profileMetadata?: Record<string, unknown> | null }).profileMetadata ?? null)
      } catch (metadataError) {
        if (!isActive) {
          return
        }

        setError(
          metadataError instanceof Error
            ? metadataError.message
            : "Unable to load Keycloak user profile metadata",
        )
      } finally {
        if (isActive) {
          setIsLoadingCreateMetadata(false)
        }
      }
    }

    void loadCreateMetadata()

    return () => {
      isActive = false
    }
  }, [isCreateOpen])

  async function handleCreateUser(payload: Record<string, unknown>) {
    try {
      setIsCreating(true)

      const response = await fetch("/api/keycloak/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      const responsePayload = await response.json()

      if (!response.ok) {
        throw new Error(readErrorMessage(responsePayload, "Unable to create Keycloak user"))
      }

      setIsCreateOpen(false)
      setRefreshKey((current) => current + 1)
      setCreateResult({
        id: String(responsePayload.id ?? ""),
        username: String(responsePayload.user?.username ?? payload.username ?? ""),
        generatedPassword:
          typeof responsePayload.generatedPassword === "string" ? responsePayload.generatedPassword : null,
        passwordSource:
          responsePayload.passwordSource === "provided" ? "provided" : "generated",
        temporaryPassword: Boolean(responsePayload.temporaryPassword),
        welcomeRecipientEmail:
          typeof responsePayload.welcomeRecipientEmail === "string"
            ? responsePayload.welcomeRecipientEmail
            : null,
        defaultGroupAssignment:
          responsePayload.defaultGroupAssignment &&
          typeof responsePayload.defaultGroupAssignment === "object" &&
          typeof responsePayload.defaultGroupAssignment.groupName === "string"
            ? {
                groupName: responsePayload.defaultGroupAssignment.groupName,
                assigned: Boolean(responsePayload.defaultGroupAssignment.assigned),
                error:
                  typeof responsePayload.defaultGroupAssignment.error === "string"
                    ? responsePayload.defaultGroupAssignment.error
                    : null,
              }
            : null,
        welcomeEmail:
          responsePayload.welcomeEmail &&
          typeof responsePayload.welcomeEmail === "object" &&
          typeof responsePayload.welcomeEmail.recipient === "string"
            ? {
                sent: Boolean(responsePayload.welcomeEmail.sent),
                recipient: responsePayload.welcomeEmail.recipient,
                error:
                  typeof responsePayload.welcomeEmail.error === "string"
                    ? responsePayload.welcomeEmail.error
                    : null,
              }
            : null,
        userType: String(responsePayload.userType ?? ""),
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load Keycloak users</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {createResult ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>User created</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              `{createResult.username}` was created successfully.
            </p>
            {createResult.welcomeRecipientEmail ? (
              <div className="rounded-[0.9rem] border border-border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Welcome recipient</p>
                <p className="mt-2 text-sm text-foreground">{createResult.welcomeRecipientEmail}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {createResult.welcomeEmail?.sent
                    ? "Welcome email was sent successfully after the account was created."
                    : createResult.welcomeEmail?.error
                      ? `User creation succeeded, but welcome email delivery failed: ${createResult.welcomeEmail.error}`
                      : "This external recipient was captured for employee onboarding delivery."}
                </p>
              </div>
            ) : null}
            {createResult.defaultGroupAssignment ? (
              <div className="rounded-[0.9rem] border border-border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Default group</p>
                <p className="mt-2 text-sm text-foreground">{createResult.defaultGroupAssignment.groupName}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {createResult.defaultGroupAssignment.assigned
                    ? "The employee account was added to the default Jira ServiceDesk group."
                    : createResult.defaultGroupAssignment.error
                      ? `User creation succeeded, but the default group assignment failed: ${createResult.defaultGroupAssignment.error}`
                      : "Default group assignment was not completed."}
                </p>
              </div>
            ) : null}
            {createResult.passwordSource === "generated" && createResult.generatedPassword ? (
              <div className="rounded-[0.9rem] border border-border bg-background px-4 py-3">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Generated password</p>
                <p className="mt-2 font-mono text-sm text-foreground">{createResult.generatedPassword}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {createResult.temporaryPassword
                    ? "Temporary password is enabled. The user must change it on first sign-in."
                    : "Temporary password is disabled for this generated credential."}
                </p>
              </div>
            ) : (
              <div className="rounded-[0.9rem] border border-border bg-background px-4 py-3">
                <p className="text-sm text-foreground">The password from the create form was applied successfully.</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {createResult.temporaryPassword
                    ? "Temporary password is enabled. The user must change it on first sign-in."
                    : "Temporary password is disabled for this credential."}
                </p>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full bg-transparent"
                onClick={() => router.push(`/users/${createResult.id}`)}
              >
                Open user
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setCreateResult(null)}
              >
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Realm users</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.totalUsers ?? 0}
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
                <p className="text-sm text-muted-foreground">Enabled users</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.enabledUsers ?? 0}
                </p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Verified email</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {data?.summary.emailVerifiedUsers ?? 0}
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
                <p className="text-sm text-muted-foreground">Current scope</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">{data?.total ?? 0}</p>
                <p className="mt-2 text-xs text-muted-foreground">{data?.summary.realm ?? "Keycloak realm"}</p>
              </div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-background text-foreground">
                <KeyRound className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <CardTitle className="text-lg">Realm user inventory</CardTitle>
              <CardDescription>
                Search the configured realm and open a full user workspace for edits, password resets, and session controls.
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
                  placeholder="Search by username, email, or name"
                  className="h-11 rounded-full bg-background pl-10"
                />
              </div>

              <Button
                variant="outline"
                className="h-11 rounded-full bg-transparent px-5"
                onClick={() => {
                  setError(null)
                  setIsImportOpen(true)
                }}
              >
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>

              <Button
                className="h-11 rounded-full px-5"
                onClick={() => {
                  setError(null)
                  setIsCreateOpen(true)
                }}
              >
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
              Loading Keycloak users...
            </div>
          ) : !data || data.items.length === 0 ? (
            <Empty className="m-6 rounded-[1.5rem] border border-dashed border-border bg-background">
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyHeader>
                <EmptyTitle>No users found</EmptyTitle>
                <EmptyDescription>
                  The current Keycloak search did not return any users for this realm.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">User</TableHead>
                    <TableHead className="px-5">Status</TableHead>
                    <TableHead className="px-5">Groups</TableHead>
                    <TableHead className="px-5">Password</TableHead>
                    <TableHead className="px-5">Required actions</TableHead>
                    <TableHead className="px-5 text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((user) => (
                    <TableRow key={user.id} className="border-border">
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5">
                          <p className="font-medium text-foreground">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.username}</p>
                          <p className="text-sm text-muted-foreground">{user.email || "No email address"}</p>
                          <p className="text-xs text-muted-foreground">Created {formatTimestamp(user.createdAt)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top">
                        <Badge variant="outline" className={getUserStatusClass(user)}>
                          {getUserStatusLabel(user)}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">{user.groupCount} group(s)</p>
                          <div className="flex flex-wrap gap-2">
                            {user.groups.length === 0 ? (
                              <span className="text-sm text-muted-foreground">No group assignments</span>
                            ) : (
                              user.groups.map((group) => (
                                <Badge
                                  key={group.id}
                                  variant="outline"
                                  className="border-border bg-background text-muted-foreground"
                                >
                                  {group.name}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        <div className="space-y-1.5 text-sm">
                          <p className="font-medium text-foreground">
                            {user.passwordLastSetAt ? formatTimestamp(user.passwordLastSetAt) : "No password credential"}
                          </p>
                          {user.passwordTemporary ? (
                            <p className="text-amber-600 dark:text-amber-300">Temporary password active</p>
                          ) : null}
                          {user.credentialTypes.length > 0 ? (
                            <p className="text-muted-foreground">{user.credentialTypes.join(", ")}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 align-top whitespace-normal">
                        {user.requiredActions.length === 0 ? (
                          <span className="text-sm text-muted-foreground">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {user.requiredActions.map((action) => (
                              <Badge
                                key={action}
                                variant="outline"
                                className="border-border bg-background text-muted-foreground"
                              >
                                {action}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-right align-top">
                        <Button asChild variant="outline" className="rounded-full bg-transparent px-4">
                          <Link href={`/users/${user.id}`}>
                            Manage user
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
                  Page {data.page} of {data.pageCount} · {data.total} matching users
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

      <UserEditorDialog
        mode="create"
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        profileMetadata={createProfileMetadata}
        isSubmitting={isCreating || isLoadingCreateMetadata}
        onSubmit={handleCreateUser}
      />
      <UserImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImported={(count) => {
          if (count > 0) {
            setRefreshKey((current) => current + 1)
          }
        }}
      />
    </div>
  )
}
