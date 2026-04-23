"use client"

import { useEffect, useState } from "react"
import { Building2, LoaderCircle, MapPinHouse, Plus, Save, Shield, Trash2, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SettingsOptionKind = "role" | "team" | "department" | "workAddress"

interface SettingsOptionLists {
  role: string[]
  team: string[]
  department: string[]
  workAddress: string[]
}

interface OptionListsResponse {
  items: SettingsOptionLists
}

const emptyOptionLists: SettingsOptionLists = {
  role: [],
  team: [],
  department: [],
  workAddress: [],
}

const optionListMeta: Record<
  SettingsOptionKind,
  {
    title: string
    description: string
    placeholder: string
    icon: typeof Shield
  }
> = {
  role: {
    title: "Role list",
    description: "Used in the operator profile editor.",
    placeholder: "Identity Operations Lead",
    icon: Shield,
  },
  team: {
    title: "Team list",
    description: "Used in the operator profile editor.",
    placeholder: "Identity and Access Operations",
    icon: Users,
  },
  department: {
    title: "Department list",
    description: "Used in Keycloak create user for employee accounts.",
    placeholder: "Human Resources",
    icon: Building2,
  },
  workAddress: {
    title: "Work address list",
    description: "Used in Keycloak create user welcome details.",
    placeholder: "38 Phan Dinh Phung, Ba Dinh, Ha Noi",
    icon: MapPinHouse,
  },
}

function sanitizeItems(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function OptionListCard({
  kind,
  items,
  isLoading,
  isSaving,
  onChange,
  onAdd,
  onRemove,
  onSave,
}: {
  kind: SettingsOptionKind
  items: string[]
  isLoading: boolean
  isSaving: boolean
  onChange: (index: number, value: string) => void
  onAdd: () => void
  onRemove: (index: number) => void
  onSave: () => void
}) {
  const meta = optionListMeta[kind]
  const Icon = meta.icon

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg">{meta.title}</CardTitle>
            <CardDescription>{meta.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              No values saved yet.
            </div>
          ) : null}

          {items.map((item, index) => (
            <div key={`${kind}-${index}`} className="flex items-center gap-3">
              <Input
                value={item}
                disabled={isLoading || isSaving}
                placeholder={meta.placeholder}
                onChange={(event) => onChange(index, event.target.value)}
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="shrink-0"
                disabled={isLoading || isSaving}
                onClick={onRemove.bind(null, index)}
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
            disabled={isLoading || isSaving}
            onClick={onAdd}
          >
            <Plus className="h-4 w-4" />
            Add item
          </Button>
          <Button
            type="button"
            disabled={isLoading || isSaving}
            onClick={onSave}
          >
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving..." : "Save list"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function OptionListsContent() {
  const [lists, setLists] = useState<SettingsOptionLists>(emptyOptionLists)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingKind, setIsSavingKind] = useState<SettingsOptionKind | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadLists() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/settings/options", { cache: "no-store" })

        if (!response.ok) {
          throw new Error("Unable to load option lists")
        }

        const payload = (await response.json()) as OptionListsResponse

        if (!isActive) {
          return
        }

        setLists({
          role: sanitizeItems(payload.items.role ?? []),
          team: sanitizeItems(payload.items.team ?? []),
          department: sanitizeItems(payload.items.department ?? []),
          workAddress: sanitizeItems(payload.items.workAddress ?? []),
        })
        setMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        setMessage(error instanceof Error ? error.message : "Unable to load option lists")
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

  function updateItem(kind: SettingsOptionKind, index: number, value: string) {
    setLists((current) => ({
      ...current,
      [kind]: current[kind].map((item, itemIndex) => (itemIndex === index ? value : item)),
    }))
  }

  function addItem(kind: SettingsOptionKind) {
    setLists((current) => ({
      ...current,
      [kind]: [...current[kind], ""],
    }))
  }

  function removeItem(kind: SettingsOptionKind, index: number) {
    setLists((current) => ({
      ...current,
      [kind]: current[kind].filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  async function saveKind(kind: SettingsOptionKind) {
    setIsSavingKind(kind)
    setMessage(null)

    try {
      const items = sanitizeItems(lists[kind])
      const response = await fetch(`/api/settings/options/${kind}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items }),
      })

      if (!response.ok) {
        throw new Error("Unable to save option list")
      }

      const payload = (await response.json()) as { kind: SettingsOptionKind; items: string[]; updatedAt?: string }

      setLists((current) => ({
        ...current,
        [kind]: payload.items ?? items,
      }))
      setMessage(`${optionListMeta[kind].title} saved${payload.updatedAt ? ` at ${new Date(payload.updatedAt).toLocaleString()}` : ""}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save option list")
    } finally {
      setIsSavingKind(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Field option lists</CardTitle>
        <CardDescription>
          Manage reusable values for operator profile fields and Keycloak create-user forms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 xl:grid-cols-2">
          {(Object.keys(optionListMeta) as SettingsOptionKind[]).map((kind) => (
            <OptionListCard
              key={kind}
              kind={kind}
              items={lists[kind]}
              isLoading={isLoading}
              isSaving={isSavingKind === kind}
              onChange={(index, value) => updateItem(kind, index, value)}
              onAdd={() => addItem(kind)}
              onRemove={(index) => removeItem(kind, index)}
              onSave={() => void saveKind(kind)}
            />
          ))}
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
          {message ?? "Changes are saved per list. These values are reused by the profile editor and Keycloak create-user flow."}
        </div>
      </CardContent>
    </Card>
  )
}
