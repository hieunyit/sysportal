"use client"

import { useEffect, useMemo, useState } from "react"
import { LogOut, PencilLine } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { readApiErrorMessage, readApiSuccessMessage } from "@/lib/api-client"

interface ProfileSettings {
  fullName: string
  email: string
  role: string
  team: string
  updatedAt?: string
}

interface ProfileSettingsResponse {
  profile: ProfileSettings
  options: {
    roles: string[]
    teams: string[]
  }
}

interface AuthSessionUser {
  name: string
  email: string
  preferredUsername: string
  roles: string[]
}

interface AuthSessionResponse {
  authenticated: boolean
  user: AuthSessionUser | null
}

const defaultProfile: ProfileSettings = {
  fullName: "Identity Admin",
  email: "iam.ops@company.local",
  role: "Identity Operations Lead",
  team: "Identity and Access Operations",
}

export function AccountMenu() {
  const [profile, setProfile] = useState<ProfileSettings>(defaultProfile)
  const [draft, setDraft] = useState<ProfileSettings>(defaultProfile)
  const [options, setOptions] = useState<ProfileSettingsResponse["options"]>({
    roles: [defaultProfile.role],
    teams: [defaultProfile.team],
  })
  const [sessionUser, setSessionUser] = useState<AuthSessionUser | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isActive = true

    async function loadProfile() {
      try {
        setIsLoading(true)
        const [profileResponse, sessionResponse] = await Promise.all([
          fetch("/api/settings/profile", { cache: "no-store" }),
          fetch("/api/auth/session", { cache: "no-store" }),
        ])

        if (!profileResponse.ok) {
          throw new Error("Unable to load profile")
        }

        const [profileData, sessionData] = (await Promise.all([
          profileResponse.json(),
          sessionResponse.ok ? sessionResponse.json() : Promise.resolve({ authenticated: false, user: null }),
        ])) as [ProfileSettingsResponse, AuthSessionResponse]

        if (!isActive) {
          return
        }

        const nextOptions = {
          roles: Array.from(new Set([profileData.profile.role, ...(profileData.options.roles ?? [])].filter(Boolean))),
          teams: Array.from(new Set([profileData.profile.team, ...(profileData.options.teams ?? [])].filter(Boolean))),
        }

        const nextProfile =
          sessionData.authenticated && sessionData.user
            ? {
                ...profileData.profile,
                fullName:
                  sessionData.user.name || sessionData.user.preferredUsername || profileData.profile.fullName,
                email: sessionData.user.email || profileData.profile.email,
              }
            : profileData.profile

        setOptions(nextOptions)
        setSessionUser(sessionData.authenticated ? sessionData.user : null)
        setProfile(nextProfile)
        setDraft(nextProfile)
      } catch (error) {
        if (!isActive) {
          return
        }

        toast.error("Unable to load profile", {
          description: error instanceof Error ? error.message : "Unable to load profile",
        })
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isActive = false
    }
  }, [])

  const initials = useMemo(() => {
    return profile.fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "IA"
  }, [profile.fullName])

  async function saveProfile() {
    setIsSaving(true)

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => null)) as ProfileSettingsResponse | null

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "Unable to save profile"))
      }

      const savedProfile = payload as ProfileSettingsResponse
      const nextOptions = {
        roles: Array.from(new Set([savedProfile.profile.role, ...(savedProfile.options.roles ?? [])].filter(Boolean))),
        teams: Array.from(new Set([savedProfile.profile.team, ...(savedProfile.options.teams ?? [])].filter(Boolean))),
      }
      const nextProfile =
        sessionUser
          ? {
              ...savedProfile.profile,
              fullName: sessionUser.name || sessionUser.preferredUsername || savedProfile.profile.fullName,
              email: sessionUser.email || savedProfile.profile.email,
            }
          : savedProfile.profile

      setOptions(nextOptions)
      setProfile(nextProfile)
      setDraft(nextProfile)
      setIsDialogOpen(false)
      toast.success("Profile updated", {
        description: readApiSuccessMessage(savedProfile, "Role and team were saved."),
      })
    } catch (error) {
      toast.error("Unable to save profile", {
        description: error instanceof Error ? error.message : "Unable to save profile",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="ml-1 flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-2.5 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-sm transition-colors hover:border-primary/25"
          >
            <Avatar className="h-9 w-9 border border-primary/20">
              <AvatarImage src="/profile.jpg" alt={profile.fullName} />
              <AvatarFallback className="bg-primary/15 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="hidden text-xs md:block">
              <p className="font-semibold text-foreground">{profile.fullName}</p>
              <p className="text-muted-foreground">{profile.email}</p>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-72 p-2">
          <DropdownMenuLabel className="px-3 py-2">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{profile.fullName}</p>
              <p className="text-xs text-muted-foreground">{profile.role}</p>
              <p className="text-xs text-muted-foreground">{profile.team}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="rounded-xl px-3 py-2" onSelect={() => {
            setDraft(profile)
            setIsDialogOpen(true)
          }}>
            <PencilLine className="h-4 w-4" />
            Edit profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="rounded-xl px-3 py-2"
            onSelect={() => {
              window.location.assign("/api/auth/logout")
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl rounded-2xl border-border/80 bg-card">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>
              Authenticated name and email are synced from Keycloak. Only role and team are managed here.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">Full name</Label>
              <Input
                id="profile-full-name"
                value={draft.fullName}
                readOnly
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={draft.email}
                readOnly
                disabled={isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role</Label>
              <Select
                value={draft.role}
                disabled={isSaving}
                onValueChange={(value) => setDraft((current) => ({ ...current, role: value }))}
              >
                <SelectTrigger id="profile-role" className="w-full">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {options.roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-team">Team</Label>
              <Select
                value={draft.team}
                disabled={isSaving}
                onValueChange={(value) => setDraft((current) => ({ ...current, team: value }))}
              >
                <SelectTrigger id="profile-team" className="w-full">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {options.teams.map((team) => (
                    <SelectItem key={team} value={team}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Loading profile...</p>}

          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={() => void saveProfile()} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
