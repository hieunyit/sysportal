"use client"

import { useEffect, useState } from "react"
import { Eye, FilePen, KeyRound, LoaderCircle, Trash2, UserCog } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { readApiErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

type AuthUserPermission = "view" | "edit" | "delete"

interface AuthUser {
  subject: string
  preferredUsername: string
  fullName: string
  email: string
  roles: string[]
  permissions: AuthUserPermission[]
  lastLoginAt: string
}

const PERMISSION_DEFS: {
  key: AuthUserPermission
  label: string
  description: string
  icon: React.ElementType
  color: string
}[] = [
  {
    key: "view",
    label: "View",
    description: "Read-only access to all resources",
    icon: Eye,
    color: "text-sky-500",
  },
  {
    key: "edit",
    label: "Edit",
    description: "Create and modify resources",
    icon: FilePen,
    color: "text-amber-500",
  },
  {
    key: "delete",
    label: "Delete",
    description: "Remove resources permanently",
    icon: Trash2,
    color: "text-rose-500",
  },
]

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function UserPermissionRow({ user }: { user: AuthUser }) {
  const [permissions, setPermissions] = useState<Set<AuthUserPermission>>(
    new Set(user.permissions),
  )
  const [savingKey, setSavingKey] = useState<AuthUserPermission | null>(null)

  async function togglePermission(key: AuthUserPermission, enabled: boolean) {
    setSavingKey(key)
    const nextSet = new Set(permissions)
    if (enabled) {
      nextSet.add(key)
    } else {
      nextSet.delete(key)
    }
    setPermissions(nextSet)

    try {
      const response = await fetch(
        `/api/settings/auth-users/${encodeURIComponent(user.subject)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions: Array.from(nextSet) }),
        },
      )
      const payload = (await response.json().catch(() => null)) as AuthUser | null

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "Unable to update permissions"))
      }

      setPermissions(new Set(payload?.permissions ?? Array.from(nextSet)))
    } catch (error) {
      setPermissions(permissions)
      const message = error instanceof Error ? error.message : "Unable to update permissions"
      toast.error("Unable to update permissions", { description: message })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="rounded-xl border border-border/80 bg-muted/10 p-4 transition-colors hover:bg-muted/15">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
            {getInitials(user.fullName || user.preferredUsername)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {user.fullName || user.preferredUsername}
            </p>
            <p className="text-xs text-muted-foreground">@{user.preferredUsername}</p>
            {user.email && (
              <p className="text-xs text-muted-foreground">{user.email}</p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              Last sign-in: {formatDate(user.lastLoginAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {PERMISSION_DEFS.map(({ key, label, description, icon: Icon, color }) => {
            const enabled = permissions.has(key)
            const isSaving = savingKey === key

            return (
              <div
                key={key}
                className={cn(
                  "flex w-32 flex-col gap-2 rounded-xl border p-3 transition-colors",
                  enabled ? "border-border/80 bg-card" : "border-dashed border-border/60 bg-transparent",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn("flex h-7 w-7 items-center justify-center rounded-md bg-muted/30", color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  {isSaving ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={enabled}
                      disabled={savingKey !== null}
                      onCheckedChange={(checked) => void togglePermission(key, checked)}
                      className="scale-90"
                    />
                  )}
                </div>
                <div>
                  <p className={cn("text-xs font-medium", enabled ? "text-foreground" : "text-muted-foreground")}>
                    {label}
                  </p>
                  <p className="text-[10px] leading-tight text-muted-foreground">{description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function AccessControlContent() {
  const [users, setUsers] = useState<AuthUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    let isActive = true

    async function loadUsers() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/settings/auth-users", { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as { items: AuthUser[] } | null

        if (!response.ok) {
          throw new Error(readApiErrorMessage(payload, "Unable to load users"))
        }

        if (!isActive) return
        setUsers(payload?.items ?? [])
        setError(null)
      } catch (err) {
        if (!isActive) return
        const message = err instanceof Error ? err.message : "Unable to load users"
        setError(message)
        toast.error("Unable to load access users", { description: message })
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadUsers()
    return () => { isActive = false }
  }, [])

  const filtered = users.filter((u) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      u.preferredUsername.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserCog className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">Access control</CardTitle>
              <CardDescription className="mt-1">
                Assign view, edit, and delete permissions to users who have authenticated with this
                workspace. Changes take effect on the user&apos;s next sign-in.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            {PERMISSION_DEFS.map(({ key, label, icon: Icon, color, description }) => (
              <div key={key} className="flex items-center gap-2">
                <div className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-muted/40", color)}>
                  <Icon className="h-3 w-3" />
                </div>
                <div>
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <span className="ml-1.5 text-xs text-muted-foreground">— {description}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, username, or email..."
          className="max-w-sm rounded-xl"
        />
        {isLoading && <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!isLoading && !error && users.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-10 text-center">
          <KeyRound className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No users have signed in yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Users will appear here after their first successful authentication.
          </p>
        </div>
      )}

      {!isLoading && !error && users.length > 0 && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-6 py-6 text-center text-sm text-muted-foreground">
          No users match &quot;{search}&quot;
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((user) => (
            <UserPermissionRow key={user.subject} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}
