"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  FolderTree,
  KeyRound,
  LockOpen,
  LoaderCircle,
  LogOut,
  Plus,
  Shield,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Trash2,
  UserPen,
  UserRound,
  UserX,
  Workflow,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatTimestamp } from "@/lib/email-template-utils"
import {
  PasswordResetDialog,
  UserEditorDialog,
  type EditableUserState,
} from "@/components/keycloak/user-management-dialogs"
import { GroupAssignmentDialog } from "@/components/keycloak/group-management-dialogs"

interface UserDetailResponse {
  summary: {
    realm: string
    displayName: string | null
    eventsEnabled: boolean
    adminEventsEnabled: boolean
    adminEventsDetailsEnabled: boolean
    latestSuccessfulLoginAt: string | null
    passwordLastSetAt: string | null
  }
  user: {
    id: string
    username: string
    displayName: string
    firstName: string
    lastName: string
    email: string
    enabled: boolean
    emailVerified: boolean
    createdAt: string | null
    federationLink: string | null
    requiredActions: string[]
    disableableCredentialTypes: string[]
    notBefore: number | null
    attributes: Record<string, string[]>
    access: Record<string, boolean>
    userProfileMetadata: Record<string, unknown> | null
  }
  updateModel: Record<string, unknown>
  security: {
    passwordCredentialId: string | null
    passwordLastSetAt: string | null
    passwordTemporary: boolean
    bruteForceStatus: Record<string, unknown> | null
  }
  credentials: Array<{
    id: string
    type: string
    userLabel: string | null
    createdAt: string | null
    priority: number | null
    temporary: boolean
    device: string | null
    credentialData: string | null
  }>
  groups: Array<{
    id: string
    name: string
    path: string
  }>
  roleMappings: {
    realmMappings?: Array<{ id?: string; name?: string; description?: string }>
    clientMappings?: Record<
      string,
      {
        client?: string
        mappings?: Array<{ id?: string; name?: string; description?: string }>
      }
    >
  }
  federatedIdentities: Array<{
    identityProvider?: string
    userId?: string
    userName?: string
  }>
  sessions: Array<{
    id: string
    username: string
    ipAddress: string | null
    startAt: string | null
    lastAccessAt: string | null
    rememberMe: boolean
    clients: Record<string, string>
    transientUser: boolean
  }>
  realmEvents: Array<{
    id: string
    source: "realm-event"
    occurredAt: string | null
    epoch: number
    label: string
    clientId: string | null
    ipAddress: string | null
    sessionId: string | null
    error: string | null
    details: Record<string, string>
  }>
  adminEvents: Array<{
    id: string
    source: "admin-event"
    occurredAt: string | null
    epoch: number
    label: string
    clientId: string | null
    ipAddress: string | null
    sessionId: string | null
    error: string | null
    resourcePath: string | null
    actorUserId: string | null
    actorUsername: string | null
    details: Record<string, string>
  }>
  activity: Array<{
    id: string
    source: "realm-event" | "admin-event"
    occurredAt: string | null
    epoch: number
    label: string
    clientId: string | null
    ipAddress: string | null
    sessionId: string | null
    error: string | null
    resourcePath?: string | null
    actorUserId?: string | null
    actorUsername?: string | null
    details: Record<string, string>
  }>
  warnings: string[]
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

function renderJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function formatLabel(value: string) {
  return value
    .split(/[_.-]/g)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ")
}

function toEditableUserState(payload: UserDetailResponse): EditableUserState {
  return {
    username: payload.user.username,
    firstName: payload.user.firstName,
    lastName: payload.user.lastName,
    email: payload.user.email,
    enabled: payload.user.enabled,
    emailVerified: payload.user.emailVerified,
    requiredActions: payload.user.requiredActions,
    attributes: payload.user.attributes,
    updateModel: payload.updateModel,
  }
}

export function UserDetailContent({ userId }: { userId: string }) {
  const [data, setData] = useState<UserDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordOpen, setIsPasswordOpen] = useState(false)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isOffboardOpen, setIsOffboardOpen] = useState(false)
  const [isOffboarding, setIsOffboarding] = useState(false)
  const [offboardResult, setOffboardResult] = useState<{
    groupsRemoved: string[]
    vpnRevoked: boolean
  } | null>(null)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    tone: "success" | "error"
    message: string
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadUser() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/keycloak/users/${userId}`, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, "Unable to load Keycloak user detail"))
        }

        if (!isActive) {
          return
        }

        setData(payload as UserDetailResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load Keycloak user detail")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadUser()

    return () => {
      isActive = false
    }
  }, [refreshKey, userId])

  async function runUserMutation(
    label: string,
    path: string,
    options?: RequestInit,
  ) {
    try {
      setPendingAction(label)
      setFeedback(null)

      const response = await fetch(path, options)
      const payload =
        response.status === 204 ? null : await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, `Unable to ${label.toLowerCase()}`))
      }

      setFeedback({
        tone: "success",
        message: label,
      })
      setRefreshKey((current) => current + 1)
    } catch (mutationError) {
      const message =
        mutationError instanceof Error ? mutationError.message : `Unable to ${label.toLowerCase()}`

      setFeedback({
        tone: "error",
        message,
      })

      throw mutationError
    } finally {
      setPendingAction(null)
    }
  }

  async function handleEditUser(payload: Record<string, unknown>) {
    await runUserMutation("User profile updated", `/api/keycloak/users/${userId}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    setIsEditOpen(false)
  }

  async function handleResetPassword(payload: { password: string; temporary: boolean }) {
    await runUserMutation("Password reset completed", `/api/keycloak/users/${userId}/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    setIsPasswordOpen(false)
  }

  async function handleToggleEnabled(nextEnabled: boolean) {
    await runUserMutation(
      nextEnabled ? "User enabled" : "User disabled",
      `/api/keycloak/users/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          enabled: nextEnabled,
        }),
      },
    )
  }

  async function handleLogoutSessions() {
    await runUserMutation("All active sessions terminated", `/api/keycloak/users/${userId}/logout`, {
      method: "POST",
    })
  }

  async function handleClearLock() {
    await runUserMutation("Brute-force lock cleared", `/api/keycloak/users/${userId}/login-failures`, {
      method: "DELETE",
    })
  }

  async function handleResetOtp() {
    await runUserMutation("OTP credentials reset", `/api/keycloak/users/${userId}/otp`, {
      method: "DELETE",
    })
  }

  async function handleAddGroup(payload: { groupId: string }) {
    await runUserMutation("Group membership added", `/api/keycloak/users/${userId}/groups`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
    setIsAddGroupOpen(false)
  }

  async function handleRemoveGroup(groupId: string) {
    await runUserMutation("Group membership removed", `/api/keycloak/users/${userId}/groups/${groupId}`, {
      method: "DELETE",
    })
  }

  async function handleOffboard() {
    setIsOffboarding(true)
    try {
      const response = await fetch(`/api/keycloak/users/${userId}/offboard`, { method: "POST" })
      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean
        data?: { groupsRemoved: string[]; vpnRevoked: boolean }
        message?: string
        error?: string
      } | null
      if (!response.ok) {
        throw new Error(payload?.error ?? "Offboarding failed")
      }
      setOffboardResult(payload?.data ?? { groupsRemoved: [], vpnRevoked: false })
      setFeedback({ tone: "success", message: payload?.message ?? "User offboarded" })
      setRefreshKey((k) => k + 1)
    } catch (err) {
      setFeedback({ tone: "error", message: err instanceof Error ? err.message : "Offboarding failed" })
    } finally {
      setIsOffboarding(false)
      setIsOffboardOpen(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading Keycloak user detail...
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-border/70 bg-card/92">
        <CardContent className="space-y-4 p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">User detail unavailable</h2>
            <p className="text-sm leading-6 text-muted-foreground">{error ?? "The requested user could not be loaded."}</p>
          </div>
          <Button asChild variant="outline" className="rounded-lg px-5">
            <Link href="/users">
              <ArrowLeft className="h-4 w-4" />
              Back to users
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-0">
        <div className="min-w-0 flex-1 space-y-6 md:pr-6">
          <div className="space-y-4">
            <Button asChild variant="ghost" className="h-8 rounded-xl px-3 text-muted-foreground">
              <Link href="/users">
                <ArrowLeft className="h-4 w-4" />
                Back to users
              </Link>
            </Button>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
                  <UserRound className="h-7 w-7" />
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                        {data.user.displayName || data.user.username}
                      </h2>
                      <Badge
                        variant="outline"
                        className={
                          data.user.enabled
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                            : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                        }
                      >
                        {data.user.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      {!data.user.emailVerified ? (
                        <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                          Email unverified
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[data.user.username, data.user.email || null, data.summary.realm].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Sessions</p>
                      <p className="text-sm font-semibold text-foreground">{data.sessions.length}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Last login</p>
                      <p className="text-sm font-semibold text-foreground">{formatTimestamp(data.summary.latestSuccessfulLoginAt)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Federation</p>
                      <p className="text-sm font-semibold text-foreground">{data.user.federationLink ?? "Local user"}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Realm</p>
                      <p className="text-sm font-semibold text-foreground">{data.summary.realm}</p>
                    </div>
                  </div>
                </div>
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
              <AlertTitle>Some live Keycloak sections are limited</AlertTitle>
              <AlertDescription>
                {data.warnings.join(" ")}
              </AlertDescription>
            </Alert>
          ) : null}

          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="inline-flex h-auto items-center rounded-full border border-border/70 bg-muted/40 p-1">
              <TabsTrigger value="overview" className="h-9 rounded-full px-6 text-sm">Overview</TabsTrigger>
              <TabsTrigger value="access" className="h-9 rounded-full px-6 text-sm">Access</TabsTrigger>
              <TabsTrigger value="activity" className="h-9 rounded-full px-6 text-sm">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr,0.95fr]">
            <Card className="border-border/70 bg-card/92 shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Identity profile</CardTitle>
                    <CardDescription>Core state and editable fields.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Username</p>
                  <p className="mt-2 font-medium text-foreground">{data.user.username}</p>
                </div>
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Federation link</p>
                  <p className="mt-2 font-medium text-foreground">{data.user.federationLink ?? "Local user"}</p>
                </div>
                <div className="rounded-[1rem] border border-border bg-background p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Required actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {data.user.requiredActions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">No pending required actions</span>
                    ) : (
                      data.user.requiredActions.map((action) => (
                        <Badge key={action} variant="outline" className="border-border bg-card text-muted-foreground">
                          {action}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                <div className="rounded-[1rem] border border-border bg-background p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Attributes</p>
                  {Object.keys(data.user.attributes).length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No custom user attributes were returned.</p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {Object.entries(data.user.attributes).map(([key, values]) => (
                        <div key={key} className="rounded-[0.9rem] border border-border bg-card p-3">
                          <p className="text-sm font-medium text-foreground">{key}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{values.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/92 shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Credentials and identity links</CardTitle>
                    <CardDescription>Credential age and identity links.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Password status</p>
                    <p className="mt-2 font-medium text-foreground">
                      {data.security.passwordTemporary ? "Temporary password" : "Standard credential"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Last set {formatTimestamp(data.security.passwordLastSetAt)}
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Disableable credential types</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {data.user.disableableCredentialTypes.length > 0
                        ? data.user.disableableCredentialTypes.join(", ")
                        : "Not reported"}
                    </p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="px-4">Type</TableHead>
                      <TableHead className="px-4">Created</TableHead>
                      <TableHead className="px-4">Label</TableHead>
                      <TableHead className="px-4">Flags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.credentials.map((credential) => (
                      <TableRow key={credential.id} className="border-border">
                        <TableCell className="px-4 py-3">{credential.type || "unknown"}</TableCell>
                        <TableCell className="px-4 py-3">{formatTimestamp(credential.createdAt)}</TableCell>
                        <TableCell className="px-4 py-3">{credential.userLabel ?? credential.device ?? "n/a"}</TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {credential.temporary ? (
                              <Badge variant="outline" className="border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-300">
                                Temporary
                              </Badge>
                            ) : null}
                            {credential.priority !== null ? (
                              <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                Priority {credential.priority}
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Federated identities</p>
                  {data.federatedIdentities.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No federated identity links were returned.</p>
                  ) : (
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {data.federatedIdentities.map((identity, index) => (
                        <div key={`${identity.identityProvider ?? "provider"}-${index}`} className="rounded-[0.9rem] border border-border bg-card p-3">
                          <p className="font-medium text-foreground">{identity.identityProvider ?? "Unknown provider"}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {identity.userName ?? identity.userId ?? "No external username"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

            <TabsContent value="access" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[0.9fr,1.1fr]">
            <Card className="border-border/70 bg-card/92 shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <FolderTree className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Groups and roles</CardTitle>
                    <CardDescription>Membership and mapped roles.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Group memberships</p>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-8 rounded-lg bg-transparent px-3 text-xs"
                      onClick={() => setIsAddGroupOpen(true)}
                      disabled={Boolean(pendingAction)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add group
                    </Button>
                  </div>
                  {data.groups.length === 0 ? (
                    <p className="mt-3 text-sm text-muted-foreground">No group memberships were returned.</p>
                  ) : (
                    <div className="mt-3 grid gap-3">
                      {data.groups.map((group) => (
                        <div key={group.id} className="rounded-[0.9rem] border border-border bg-card p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium text-foreground">{group.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{group.path}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-8 rounded-lg px-3 text-rose-600 hover:text-rose-600 dark:text-rose-300"
                              onClick={() => {
                                void handleRemoveGroup(group.id).catch(() => undefined)
                              }}
                              disabled={Boolean(pendingAction)}
                            >
                              {pendingAction === "Group membership removed" ? (
                                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sessions and protections</CardTitle>
                    <CardDescription>Sessions and brute-force state.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Brute-force status</p>
                  <pre className="mt-3 overflow-x-auto rounded-[0.9rem] border border-border bg-card p-3 text-xs leading-6 text-muted-foreground">
                    {renderJson(data.security.bruteForceStatus ?? {})}
                  </pre>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="px-4">IP</TableHead>
                      <TableHead className="px-4">Start</TableHead>
                      <TableHead className="px-4">Last access</TableHead>
                      <TableHead className="px-4">Clients</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.sessions.length === 0 ? (
                      <TableRow className="border-border">
                        <TableCell colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No active sessions were returned.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.sessions.map((session) => (
                        <TableRow key={session.id} className="border-border">
                          <TableCell className="px-4 py-3">{session.ipAddress ?? "Unknown"}</TableCell>
                          <TableCell className="px-4 py-3">{formatTimestamp(session.startAt)}</TableCell>
                          <TableCell className="px-4 py-3">{formatTimestamp(session.lastAccessAt)}</TableCell>
                          <TableCell className="px-4 py-3 whitespace-normal">
                            <div className="flex flex-wrap gap-2">
                              {Object.keys(session.clients).length === 0 ? (
                                <span className="text-sm text-muted-foreground">No client list</span>
                              ) : (
                                Object.entries(session.clients).map(([clientKey, clientName]) => (
                                  <Badge key={clientKey} variant="outline" className="border-border bg-background text-muted-foreground">
                                    {clientName}
                                  </Badge>
                                ))
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

            <TabsContent value="activity">
            <Card className="border-border/70 bg-card/92 shadow-none">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">User event timeline</CardTitle>
                    <CardDescription>Recent realm and admin events.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {data.activity.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-dashed border-border bg-background p-6 text-sm text-muted-foreground">
                      No realm or admin events were returned for this user.
                    </div>
                  ) : (
                    data.activity.map((event) => {
                      const meta = [
                        event.clientId ? `Client ${event.clientId}` : null,
                        event.ipAddress ? `IP ${event.ipAddress}` : null,
                        "resourcePath" in event && event.resourcePath ? event.resourcePath : null,
                        "actorUsername" in event && event.actorUsername ? `Actor ${event.actorUsername}` : null,
                      ].filter(Boolean) as string[]
                      const hasDetails = Object.keys(event.details).length > 0
                      const expandable = meta.length > 0 || hasDetails

                      return expandable ? (
                        <details key={`${event.source}-${event.id}`} className="group rounded-[1.25rem] border border-border bg-background">
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3.5">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{formatLabel(event.label)}</p>
                                <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                                  {event.source === "realm-event" ? "Realm" : "Admin"}
                                </Badge>
                                {event.error ? (
                                  <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                                    Error
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">{formatTimestamp(event.occurredAt)}</p>
                            </div>
                            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                          </summary>
                          <div className="space-y-3 border-t border-border px-4 pb-4 pt-3">
                            {meta.length > 0 ? (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {meta.map((item, i) => <span key={i}>{item}</span>)}
                              </div>
                            ) : null}
                            {hasDetails ? (
                              <div className="grid gap-2 md:grid-cols-2">
                                {Object.entries(event.details).map(([key, value]) => (
                                  <div key={key} className="rounded-[0.75rem] border border-border bg-card p-2.5">
                                    <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{formatLabel(key)}</p>
                                    <p className="mt-1 break-all text-xs text-foreground">{value}</p>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </details>
                      ) : (
                        <div key={`${event.source}-${event.id}`} className="rounded-[1.25rem] border border-border bg-background px-4 py-3.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{formatLabel(event.label)}</p>
                            <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                              {event.source === "realm-event" ? "Realm" : "Admin"}
                            </Badge>
                            {event.error ? (
                              <Badge variant="outline" className="border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300">
                                Error
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(event.occurredAt)}</p>
                        </div>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="md:w-72 md:shrink-0 md:self-stretch md:border-l md:border-border/70 md:bg-card/30">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm md:sticky md:top-6 md:rounded-none md:border-0 md:bg-transparent md:p-6 md:shadow-none">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Actions</p>
            <div className="space-y-1.5">
              <Button type="button" className="h-10 w-full justify-start rounded-xl px-4" onClick={() => setIsEditOpen(true)} disabled={Boolean(pendingAction)}>
                <UserPen className="h-4 w-4" />
                Edit profile
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start rounded-xl bg-transparent px-4"
                onClick={() => {
                  void handleToggleEnabled(!data.user.enabled).catch(() => undefined)
                }}
                disabled={Boolean(pendingAction)}
              >
                <ShieldBan className="h-4 w-4" />
                {data.user.enabled ? "Disable user" : "Enable user"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start rounded-xl bg-transparent px-4"
                onClick={() => setIsPasswordOpen(true)}
                disabled={Boolean(pendingAction)}
              >
                <KeyRound className="h-4 w-4" />
                Reset password
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start rounded-xl bg-transparent px-4"
                onClick={() => {
                  void handleResetOtp().catch(() => undefined)
                }}
                disabled={Boolean(pendingAction)}
              >
                <Shield className="h-4 w-4" />
                Reset OTP
              </Button>
              <div className="py-0.5">
                <div className="h-px bg-border/60" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start rounded-xl bg-transparent px-4 text-rose-600 hover:text-rose-600 dark:text-rose-400"
                onClick={() => {
                  void handleLogoutSessions().catch(() => undefined)
                }}
                disabled={Boolean(pendingAction)}
              >
                <LogOut className="h-4 w-4" />
                Sign out sessions
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start rounded-xl bg-transparent px-4"
                onClick={() => {
                  void handleClearLock().catch(() => undefined)
                }}
                disabled={Boolean(pendingAction)}
              >
                <LockOpen className="h-4 w-4" />
                Clear lock
              </Button>
              <div className="py-0.5">
                <div className="h-px bg-border/60" />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-start rounded-xl bg-transparent px-4 text-rose-600 hover:text-rose-600 dark:text-rose-400"
                onClick={() => setIsOffboardOpen(true)}
                disabled={Boolean(pendingAction) || isOffboarding}
              >
                <UserX className="h-4 w-4" />
                Offboard user
              </Button>
              {pendingAction ? (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-xs text-muted-foreground">
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  {pendingAction}...
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      <UserEditorDialog
        mode="edit"
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        initialValue={toEditableUserState(data)}
        profileMetadata={data.user.userProfileMetadata}
        isSubmitting={pendingAction === "User profile updated"}
        onSubmit={handleEditUser}
      />

      <PasswordResetDialog
        open={isPasswordOpen}
        onOpenChange={setIsPasswordOpen}
        username={data.user.username}
        isSubmitting={pendingAction === "Password reset completed"}
        onSubmit={handleResetPassword}
      />

      <GroupAssignmentDialog
        open={isAddGroupOpen}
        onOpenChange={setIsAddGroupOpen}
        isSubmitting={pendingAction === "Group membership added"}
        onSubmit={handleAddGroup}
      />

      <AlertDialog open={isOffboardOpen} onOpenChange={setIsOffboardOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-rose-500" />
              Offboard {data.user.displayName || data.user.username}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-1.5">
              <span className="block">This will immediately:</span>
              <ul className="ml-4 list-disc space-y-0.5 text-left text-sm">
                <li>Disable the Keycloak account</li>
                <li>Remove from all groups</li>
                <li>Terminate all active sessions</li>
                <li>Deny OpenVPN access (if applicable)</li>
              </ul>
              <span className="block pt-1 text-xs text-muted-foreground">
                This action is logged to the audit trail. The account can be re-enabled manually.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isOffboarding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-600"
              disabled={isOffboarding}
              onClick={() => void handleOffboard()}
            >
              {isOffboarding ? (
                <><LoaderCircle className="h-4 w-4 animate-spin" /> Offboarding…</>
              ) : (
                "Offboard user"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


