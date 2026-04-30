"use client"

import { useEffect, useRef, useState } from "react"
import {
  Building2,
  LoaderCircle,
  MapPinHouse,
  Plus,
  Shield,
  Users,
  X,
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
import { cn } from "@/lib/utils"

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

const emptyProfileOptionLists: ProfileOptionLists = { role: [], team: [] }
const emptyDirectoryOptionLists: DirectoryOptionLists = { department: [], workAddress: [] }

function sanitizeItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

interface ChipCatalogSectionProps {
  icon: LucideIcon
  title: string
  description: string
  placeholder: string
  items: string[]
  isLoading: boolean
  isSaving: boolean
  onRemove: (index: number) => void
  onAdd: (value: string) => void
}

function ChipCatalogSection({
  icon: Icon,
  title,
  description,
  placeholder,
  items,
  isLoading,
  isSaving,
  onRemove,
  onAdd,
}: ChipCatalogSectionProps) {
  const [newValue, setNewValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = newValue.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setNewValue("")
    inputRef.current?.focus()
  }

  const disabled = isLoading || isSaving

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-muted/15 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div>
          <p className="text-sm font-medium leading-tight">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {isSaving && <LoaderCircle className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex min-h-[2.5rem] flex-wrap items-center gap-1.5 rounded-xl border border-border/80 bg-muted/10 p-2.5">
        {items.length === 0 && !disabled && (
          <span className="px-1 text-xs text-muted-foreground">No values — add below</span>
        )}
        {items.map((item, index) => (
          <span
            key={`${title}-${index}`}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-0.5 text-xs font-medium text-foreground",
              disabled && "opacity-60",
            )}
          >
            {item}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(index)}
              className="ml-0.5 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive disabled:cursor-not-allowed"
              aria-label={`Remove ${item}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        {isLoading && <LoaderCircle className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          ref={inputRef}
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="h-8 rounded-lg text-sm"
        />
        <Button
          type="submit"
          size="sm"
          disabled={disabled || !newValue.trim()}
          className="h-8 gap-1 rounded-lg px-3 text-xs"
        >
          {isSaving ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </form>
    </div>
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

        if (!isActive) return

        setLists({
          role: sanitizeItems(payload?.items.role ?? []),
          team: sanitizeItems(payload?.items.team ?? []),
        })
        setMessage(null)
      } catch (error) {
        if (!isActive) return
        const nextMessage = error instanceof Error ? error.message : "Unable to load profile option lists"
        setMessage(nextMessage)
        toast.error("Unable to load profile option lists", { description: nextMessage })
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadLists()
    return () => { isActive = false }
  }, [])

  function removeItem(kind: ProfileOptionKind, index: number) {
    const nextItems = lists[kind].filter((_, i) => i !== index)
    setLists((current) => ({ ...current, [kind]: nextItems }))
    void saveKind(kind, nextItems)
  }

  function addItem(kind: ProfileOptionKind, value: string) {
    const trimmed = value.trim()
    if (!trimmed || lists[kind].includes(trimmed)) return
    const nextItems = [...lists[kind], trimmed]
    setLists((current) => ({ ...current, [kind]: nextItems }))
    void saveKind(kind, nextItems)
  }

  async function saveKind(kind: ProfileOptionKind, itemsOverride?: string[]) {
    setIsSavingKind(kind)
    setMessage(null)

    try {
      const items = sanitizeItems(itemsOverride ?? lists[kind])
      const response = await fetch(`/api/settings/profile-options/${kind}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { kind: ProfileOptionKind; items: string[]; updatedAt?: string; message?: string }
        | null

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "Unable to save profile option list"))
      }

      setLists((current) => ({ ...current, [kind]: payload?.items ?? items }))
      const kindLabel = kind === "role" ? "Role catalog" : "Team catalog"
      const nextMessage = `${kindLabel} saved${payload?.updatedAt ? ` at ${new Date(payload.updatedAt).toLocaleString()}` : ""}.`
      setMessage(nextMessage)
      toast.success(kindLabel, { description: readApiSuccessMessage(payload, nextMessage) })
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to save profile option list"
      setMessage(nextMessage)
      toast.error("Unable to save catalog", { description: nextMessage })
    } finally {
      setIsSavingKind(null)
    }
  }

  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg">Authorization catalogs</CardTitle>
        <CardDescription>
          Manage reusable role and team values used by operator profiles and future permission mapping.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <ChipCatalogSection
            icon={Shield}
            title="Role catalog"
            description="Used for operator profile assignment and permission mapping."
            placeholder="Identity Operations Lead"
            items={lists.role}
            isLoading={isLoading}
            isSaving={isSavingKind === "role"}
            onRemove={(i) => removeItem("role", i)}
            onAdd={(v) => addItem("role", v)}
          />
          <ChipCatalogSection
            icon={Users}
            title="Team catalog"
            description="Used for team ownership, routing, and scoped operator access."
            placeholder="Identity and Access Operations"
            items={lists.team}
            isLoading={isLoading}
            isSaving={isSavingKind === "team"}
            onRemove={(i) => removeItem("team", i)}
            onAdd={(v) => addItem("team", v)}
          />
        </div>

        {message && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
      </CardContent>
    </Card>
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

        if (!isActive) return

        setLists({
          department: sanitizeItems(payload?.items.department ?? []),
          workAddress: sanitizeItems(payload?.items.workAddress ?? []),
        })
        setMessage(null)
      } catch (error) {
        if (!isActive) return
        const nextMessage = error instanceof Error ? error.message : "Unable to load directory option lists"
        setMessage(nextMessage)
        toast.error("Unable to load directory option lists", { description: nextMessage })
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadLists()
    return () => { isActive = false }
  }, [])

  function removeItem(kind: DirectoryOptionKind, index: number) {
    const nextItems = lists[kind].filter((_, i) => i !== index)
    setLists((current) => ({ ...current, [kind]: nextItems }))
    void saveKind(kind, nextItems)
  }

  function addItem(kind: DirectoryOptionKind, value: string) {
    const trimmed = value.trim()
    if (!trimmed || lists[kind].includes(trimmed)) return
    const nextItems = [...lists[kind], trimmed]
    setLists((current) => ({ ...current, [kind]: nextItems }))
    void saveKind(kind, nextItems)
  }

  async function saveKind(kind: DirectoryOptionKind, itemsOverride?: string[]) {
    setIsSavingKind(kind)
    setMessage(null)

    try {
      const items = sanitizeItems(itemsOverride ?? lists[kind])
      const response = await fetch(`/api/settings/directory-options/${kind}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { kind: DirectoryOptionKind; items: string[]; updatedAt?: string; message?: string }
        | null

      if (!response.ok) {
        throw new Error(readApiErrorMessage(payload, "Unable to save directory option list"))
      }

      setLists((current) => ({ ...current, [kind]: payload?.items ?? items }))
      const kindLabel = kind === "department" ? "Department catalog" : "Work address catalog"
      const nextMessage = `${kindLabel} saved${payload?.updatedAt ? ` at ${new Date(payload.updatedAt).toLocaleString()}` : ""}.`
      setMessage(nextMessage)
      toast.success(kindLabel, { description: readApiSuccessMessage(payload, nextMessage) })
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to save directory option list"
      setMessage(nextMessage)
      toast.error("Unable to save catalog", { description: nextMessage })
    } finally {
      setIsSavingKind(null)
    }
  }

  return (
    <Card className="border-border/80 bg-card/80">
      <CardHeader>
        <CardTitle className="text-lg">Keycloak directory catalogs</CardTitle>
        <CardDescription>
          Manage department and work address values used during Keycloak employee onboarding and user creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-2">
          <ChipCatalogSection
            icon={Building2}
            title="Department catalog"
            description="Used in Keycloak create-user when the account type is employee."
            placeholder="Phòng Nhân sự"
            items={lists.department}
            isLoading={isLoading}
            isSaving={isSavingKind === "department"}
            onRemove={(i) => removeItem("department", i)}
            onAdd={(v) => addItem("department", v)}
          />
          <ChipCatalogSection
            icon={MapPinHouse}
            title="Work address catalog"
            description="Used for employee onboarding details and welcome email content."
            placeholder="38 Phan Dinh Phung, Ba Dinh, Ha Noi"
            items={lists.workAddress}
            isLoading={isLoading}
            isSaving={isSavingKind === "workAddress"}
            onRemove={(i) => removeItem("workAddress", i)}
            onAdd={(v) => addItem("workAddress", v)}
          />
        </div>

        {message && (
          <p className="text-xs text-muted-foreground">{message}</p>
        )}
      </CardContent>
    </Card>
  )
}
