"use client"

import { useEffect, useMemo, useState } from "react"
import { LogOut, PencilLine } from "lucide-react"
import { useRouter } from "next/navigation"
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

interface ProfileSettings {
  fullName: string
  email: string
  role: string
  team: string
  updatedAt?: string
}

const defaultProfile: ProfileSettings = {
  fullName: "Identity Admin",
  email: "iam.ops@company.local",
  role: "Identity Operations Lead",
  team: "Identity and Access Operations",
}

export function AccountMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileSettings>(defaultProfile)
  const [draft, setDraft] = useState<ProfileSettings>(defaultProfile)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadProfile() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/settings/profile", { cache: "no-store" })

        if (!response.ok) {
          throw new Error("Unable to load profile")
        }

        const data = (await response.json()) as ProfileSettings

        if (!isActive) {
          return
        }

        setProfile(data)
        setDraft(data)
        setMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        setMessage(error instanceof Error ? error.message : "Unable to load profile")
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
    setMessage(null)

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      })

      if (!response.ok) {
        throw new Error("Unable to save profile")
      }

      const nextProfile = (await response.json()) as ProfileSettings
      setProfile(nextProfile)
      setDraft(nextProfile)
      setMessage("Profile updated")
      setIsDialogOpen(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save profile")
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
            className="ml-1 flex items-center gap-3 rounded-xl border border-border/80 bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/25"
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
          <DropdownMenuItem className="rounded-xl px-3 py-2" onSelect={() => router.push("/logout")}>
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
              This is the operator profile only. Connector and SMTP settings stay in Integration settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-full-name">Full name</Label>
              <Input
                id="profile-full-name"
                value={draft.fullName}
                disabled={isSaving}
                onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={draft.email}
                disabled={isSaving}
                onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-role">Role</Label>
              <Input
                id="profile-role"
                value={draft.role}
                disabled={isSaving}
                onChange={(event) => setDraft((current) => ({ ...current, role: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-team">Team</Label>
              <Input
                id="profile-team"
                value={draft.team}
                disabled={isSaving}
                onChange={(event) => setDraft((current) => ({ ...current, team: event.target.value }))}
              />
            </div>
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}
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
