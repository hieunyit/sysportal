"use client"

import { useEffect, useState } from "react"
import {
  Building2,
  LoaderCircle,
  MapPinHouse,
  Plus,
  Save,
  Shield,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { readApiErrorMessage, readApiSuccessMessage } from "@/lib/api-client"

type ProfileOptionKind = "role" | "team"
type DirectoryOptionKind = "department" | "workAddress"

interface ProfileOptionLists {
  role: string[]
  team: string[]
}

interface DirectoryOptionLists {
  department: string[]
  workAddress: string[]
}

interface ProfileOptionListsResponse {
  items: ProfileOptionLists
  message?: string
}

interface DirectoryOptionListsResponse {
  items: DirectoryOptionLists
  message?: string
}

const emptyProfileOptionLists: ProfileOptionLists = {
  role: [],
  team: [],
}

const emptyDirectoryOptionLists: DirectoryOptionLists = {
  department: [],
  workAddress: [],
}

const profileOptionMeta: Record<
  ProfileOptionKind,
  {
    title: string
    description: string
    placeholder: string
    icon: LucideIcon
  }
> = {
  role: {
    title: "Role catalog",
    description: "Used for operator profile assignment and future permission mapping.",
    placeholder: "Identity Operations Lead",
    icon: Shield,
  },
  team: {
    title: "Team catalog",
    description: "Used for team ownership, routing, and scoped operator access.",
    placeholder: "Identity and Access Operations",
    icon: Users,
  },
}

const directoryOptionMeta: Record<
  DirectoryOptionKind,
  {
    title: string
    description: string
    placeholder: string
    icon: LucideIcon
  }
> = {
  department: {
    title: "Department catalog",
    description: "Used in Keycloak create-user when the account type is employee.",
    placeholder: "Phòng Nhân sự",
    icon: Building2,
  },
  workAddress: {
    title: "Work address catalog",
    description: "Used for employee onboarding details and welcome email content.",
    placeholder: "38 Phan Dinh Phung, Ba Dinh, Ha Noi",
    icon: MapPinHouse,
  },
}

function sanitizeItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function OptionListEditorCard({
  title,
  description,
  placeholder,
  icon: Icon,
  items,
  isLoading,
  isSaving,
  emptyMessage,
  onChange,
  onAdd,
  onRemove,
  onSave,
}: {
  title: string
  description: string
  placeholder: string
  icon: LucideIcon
  items: string[]
  isLoading: boolean
  isSaving: boolean
  emptyMessage: string
  onChange: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onSave: () => void
}) {
  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border/80 bg-muted/15 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : null}

          {items.map((item, index) => (
            <div key={`${title}-${index}`} className="flex items-center gap-3">
              <Input
                value={item}
                disabled={isLoading || isSaving}
                placeholder={placeholder}
                onChange={(event) => onChange(index, event.target.value)}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="shrink-0 bg-transparent"
                disabled={isLoading || isSaving}
                onClick={() => onRemove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            className="bg-transparent"
            disabled={isLoading || isSaving}
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
            Add item
          </Button>
          <Button type="button" disabled={isLoading || isSaving} onClick={onSave}>
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save list"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfileOptionListsContent() {
  const [lists, setLists] = useState<ProfileOptionLists>(emptyProfileOptionLists)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingKind, setIsSavingKind] = useState<ProfileOptionKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadLists() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/settings/profile-options", { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as ProfileOptionListsResponse | null

        if (!response.ok) {
          throw new Error(readApiErrorMessage(payload, "Unable to load profile option lists"))
        }

        if (!isActive) {
          return
        }

        setLists({
          role: sanitizeItems(payload?.items.role ?? []),
          team: sanitizeItems(payload?.items.team ?? []),
        })
        setMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        const nextMessage = error instanceof Error ? error.message : "Unable to load profile option lists"
        setMessage(nextMessage)
        toast.error("Unable to load profile option lists", {
          description: nextMessage,
        })
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadLists()

    return () => {
      isActive = false
    }
  }, [])

  function updateItem(kind: ProfileOptionKind, index: number, value: string) {
    setLists((current) => ({
      ...current,
      [kind]: current[kind].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }))
  }

  function addItem(kind: ProfileOptionKind) {
    setLists((current) => ({
      ...current,
      [kind]: [...current[kind], ""],
    }))
  }

  function removeItem(kind: ProfileOptionKind, index: number) {
    const nextItems = lists[kind].filter((_, itemIndex) => itemIndex !== index)

    setLists((current) => ({
      ...current,
      [kind]: nextItems,
    }))

    void saveKind(kind, nextItems)
  }

  async function saveKind(kind: ProfileOptionKind, itemsOverride?: string[]) {
    setIsSavingKind(kind)
    setMessage(null)

    try {
      const items = sanitizeItems(itemsOverride ?? lists[kind])
      const response = await fetch(`/api/settings/profile-options/${kind}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { kind: ProfileOptionKind; items: string[]; updatedAt?: string; message?: string }
        | null

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "Unable to save profile option list"))
      }

      setLists((current) => ({
        ...current,
        [kind]: payload?.items ?? items,
      }))
      const nextMessage = `${profileOptionMeta[kind].title} saved${payload?.updatedAt ? ` at ${new Date(payload.updatedAt).toLocaleString()}` : ""}.`
      setMessage(nextMessage)
      toast.success(profileOptionMeta[kind].title, {
        description: readApiSuccessMessage(payload, nextMessage),
      })
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to save profile option list"
      setMessage(nextMessage)
      toast.error(`Unable to save ${profileOptionMeta[kind].title.toLowerCase()}`, {
        description: nextMessage,
      })
    } finally {
      setIsSavingKind(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Profile authorization catalogs</CardTitle>
          <CardDescription>
            Manage reusable role and team values separately from directory data. These lists are used by the operator profile editor and future authorization mapping.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {(Object.keys(profileOptionMeta) as ProfileOptionKind[]).map((kind) => (
          <OptionListEditorCard
            key={kind}
            title={profileOptionMeta[kind].title}
            description={profileOptionMeta[kind].description}
            placeholder={profileOptionMeta[kind].placeholder}
            icon={profileOptionMeta[kind].icon}
            items={lists[kind]}
            isLoading={isLoading}
            isSaving={isSavingKind === kind}
            emptyMessage="No values saved for this catalog."
            onChange={(index, value) => updateItem(kind, index, value)}
            onAdd={() => addItem(kind)}
            onRemove={(index) => removeItem(kind, index)}
            onSave={() => void saveKind(kind)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
        {message ?? "Each catalog is saved independently. Deleting a value here now removes it from SQLite instead of being auto-seeded again."}
      </div>
    </div>
  )
}

export function DirectoryOptionListsContent() {
  const [lists, setLists] = useState<DirectoryOptionLists>(emptyDirectoryOptionLists)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingKind, setIsSavingKind] = useState<DirectoryOptionKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadLists() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/settings/directory-options", { cache: "no-store" })
        const payload = (await response.json().catch(() => null)) as DirectoryOptionListsResponse | null

        if (!response.ok) {
          throw new Error(readApiErrorMessage(payload, "Unable to load directory option lists"))
        }

        if (!isActive) {
          return
        }

        setLists({
          department: sanitizeItems(payload?.items.department ?? []),
          workAddress: sanitizeItems(payload?.items.workAddress ?? []),
        })
        setMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        const nextMessage = error instanceof Error ? error.message : "Unable to load directory option lists"
        setMessage(nextMessage)
        toast.error("Unable to load directory option lists", {
          description: nextMessage,
        })
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadLists()

    return () => {
      isActive = false
    }
  }, [])

  function updateItem(kind: DirectoryOptionKind, index: number, value: string) {
    setLists((current) => ({
      ...current,
      [kind]: current[kind].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }))
  }

  function addItem(kind: DirectoryOptionKind) {
    setLists((current) => ({
      ...current,
      [kind]: [...current[kind], ""],
    }))
  }

  function removeItem(kind: DirectoryOptionKind, index: number) {
    const nextItems = lists[kind].filter((_, itemIndex) => itemIndex !== index)

    setLists((current) => ({
      ...current,
      [kind]: nextItems,
    }))

    void saveKind(kind, nextItems)
  }

  async function saveKind(kind: DirectoryOptionKind, itemsOverride?: string[]) {
    setIsSavingKind(kind)
    setMessage(null)

    try {
      const items = sanitizeItems(itemsOverride ?? lists[kind])
      const response = await fetch(`/api/settings/directory-options/${kind}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { kind: DirectoryOptionKind; items: string[]; updatedAt?: string; message?: string }
        | null

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "Unable to save directory option list"))
      }

      setLists((current) => ({
        ...current,
        [kind]: payload?.items ?? items,
      }))
      const nextMessage = `${directoryOptionMeta[kind].title} saved${payload?.updatedAt ? ` at ${new Date(payload.updatedAt).toLocaleString()}` : ""}.`
      setMessage(nextMessage)
      toast.success(directoryOptionMeta[kind].title, {
        description: readApiSuccessMessage(payload, nextMessage),
      })
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to save directory option list"
      setMessage(nextMessage)
      toast.error(`Unable to save ${directoryOptionMeta[kind].title.toLowerCase()}`, {
        description: nextMessage,
      })
    } finally {
      setIsSavingKind(null)
    }
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Directory input catalogs</CardTitle>
          <CardDescription>
            Manage organization data used only by Keycloak create-user. Department and work address are separated from role and team so the two purposes do not overlap.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {(Object.keys(directoryOptionMeta) as DirectoryOptionKind[]).map((kind) => (
          <OptionListEditorCard
            key={kind}
            title={directoryOptionMeta[kind].title}
            description={directoryOptionMeta[kind].description}
            placeholder={directoryOptionMeta[kind].placeholder}
            icon={directoryOptionMeta[kind].icon}
            items={lists[kind]}
            isLoading={isLoading}
            isSaving={isSavingKind === kind}
            emptyMessage="No values saved for this catalog."
            onChange={(index, value) => updateItem(kind, index, value)}
            onAdd={() => addItem(kind)}
            onRemove={(index) => removeItem(kind, index)}
            onSave={() => void saveKind(kind)}
          />
        ))}
      </div>

      <div className="rounded-lg border border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
        {message ?? "Department now uses the organization list seeded in SQLite. Work address stays separate because it is only used during employee onboarding."}
      </div>
    </div>
  )
}
