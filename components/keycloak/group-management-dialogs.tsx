"use client"

import { type FormEvent, useEffect, useState } from "react"
import { Check, ChevronsUpDown, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface GroupLookupItem {
  id: string
  name: string
  path: string
  description: string | null
}

interface UserLookupItem {
  id: string
  username: string
  displayName: string
  email: string
}

interface GroupEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValue?: {
    name: string
    description: string
  }
  isSubmitting?: boolean
  onSubmit: (payload: { name: string; description: string }) => Promise<void> | void
}

interface GroupAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSubmitting?: boolean
  onSubmit: (payload: { groupId: string }) => Promise<void> | void
}

interface GroupMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isSubmitting?: boolean
  onSubmit: (payload: { userId: string }) => Promise<void> | void
}

function SearchablePicker<TItem extends { id: string; title: string; subtitle: string }>({
  placeholder,
  searchPlaceholder,
  emptyText,
  selectedId,
  items,
  isLoading,
  onSearchChange,
  onSelect,
}: {
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  selectedId: string
  items: TItem[]
  isLoading: boolean
  onSearchChange: (value: string) => void
  onSelect: (item: TItem) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = items.find((item) => item.id === selectedId) ?? null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          className="h-11 w-full justify-between rounded-2xl bg-background px-4 font-normal"
        >
          <span className="truncate text-left">
            {selected ? selected.title : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={searchPlaceholder} onValueChange={onSearchChange} />
          <CommandList>
            {isLoading ? <CommandEmpty>Searching...</CommandEmpty> : null}
            {!isLoading && items.length === 0 ? <CommandEmpty>{emptyText}</CommandEmpty> : null}
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={item.id}
                onSelect={() => {
                  onSelect(item)
                  setOpen(false)
                }}
                className="flex flex-col items-start gap-1 py-3"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <span className="font-medium">{item.title}</span>
                  <Check className={cn("h-4 w-4", selectedId === item.id ? "opacity-100" : "opacity-0")} />
                </div>
                <span className="text-xs text-muted-foreground">{item.subtitle}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function GroupEditorDialog({
  open,
  onOpenChange,
  mode,
  initialValue,
  isSubmitting = false,
  onSubmit,
}: GroupEditorDialogProps) {
  const [name, setName] = useState(initialValue?.name ?? "")
  const [description, setDescription] = useState(initialValue?.description ?? "")

  useEffect(() => {
    if (!open) {
      return
    }

    setName(initialValue?.name ?? "")
    setDescription(initialValue?.description ?? "")
  }, [initialValue?.description, initialValue?.name, open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      name,
      description,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Create group" : "Edit group"}</DialogTitle>
            <DialogDescription>
              {mode === "create"
                ? "Create a new Keycloak group for the configured realm."
                : "Update the visible group profile used in Keycloak."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="jira-servicedesk-users"
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group-description">Description</Label>
            <Textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Operational group for Jira Service Management access."
              className="min-h-28 rounded-2xl"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full bg-transparent" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create group" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GroupAssignmentDialog({
  open,
  onOpenChange,
  isSubmitting = false,
  onSubmit,
}: GroupAssignmentDialogProps) {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<GroupLookupItem[]>([])
  const [selected, setSelected] = useState<GroupLookupItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let isActive = true

    async function loadGroups() {
      try {
        setIsLoading(true)
        const searchParams = new URLSearchParams()

        if (search.trim()) {
          searchParams.set("search", search.trim())
        }

        const response = await fetch(`/api/keycloak/groups/lookup?${searchParams.toString()}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok || !isActive) {
          return
        }

        setItems((payload.items as GroupLookupItem[] | undefined) ?? [])
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
  }, [open, search])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setItems([])
      setSelected(null)
    }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selected) {
      return
    }

    await onSubmit({
      groupId: selected.id,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Add group membership</DialogTitle>
            <DialogDescription>Select a Keycloak group to assign to this user.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Group</Label>
            <SearchablePicker
              placeholder="Select a group"
              searchPlaceholder="Search groups..."
              emptyText="No matching group found."
              selectedId={selected?.id ?? ""}
              items={items.map((item) => ({
                ...item,
                title: item.name,
                subtitle: item.path,
              }))}
              isLoading={isLoading}
              onSearchChange={setSearch}
              onSelect={(item) => {
                setSelected({
                  id: item.id,
                  name: item.title,
                  path: item.subtitle,
                  description: null,
                })
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full bg-transparent" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting || !selected}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Add group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function GroupMemberDialog({
  open,
  onOpenChange,
  isSubmitting = false,
  onSubmit,
}: GroupMemberDialogProps) {
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<UserLookupItem[]>([])
  const [selected, setSelected] = useState<UserLookupItem | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    let isActive = true

    async function loadUsers() {
      try {
        setIsLoading(true)
        const searchParams = new URLSearchParams()

        if (search.trim()) {
          searchParams.set("query", search.trim())
        }

        searchParams.set("purpose", "membership")

        const response = await fetch(`/api/keycloak/users/lookup?${searchParams.toString()}`, {
          cache: "no-store",
        })
        const payload = await response.json()

        if (!response.ok || !isActive) {
          return
        }

        setItems(
          ((payload.items as Array<UserLookupItem & { ldapEntryDn?: string }> | undefined) ?? []).map((item) => ({
            id: item.id,
            username: item.username,
            displayName: item.displayName,
            email: item.email,
          })),
        )
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
  }, [open, search])

  useEffect(() => {
    if (!open) {
      setSearch("")
      setItems([])
      setSelected(null)
    }
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!selected) {
      return
    }

    await onSubmit({
      userId: selected.id,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>Search by username, full name, or email to add a user into this group.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>User</Label>
            <SearchablePicker
              placeholder="Select a user"
              searchPlaceholder="Search users..."
              emptyText="No matching user found."
              selectedId={selected?.id ?? ""}
              items={items.map((item) => ({
                ...item,
                title: item.displayName || item.username,
                subtitle: `${item.username} · ${item.email || "No email"}`,
              }))}
              isLoading={isLoading}
              onSearchChange={setSearch}
              onSelect={(item) => {
                const picked = items.find((entry) => entry.id === item.id) ?? null
                setSelected(picked)
              }}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full bg-transparent" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isSubmitting || !selected}>
              {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
