"use client"

import { type ChangeEvent, type FormEvent, type WheelEvent, useEffect, useMemo, useState } from "react"
import { AlertCircle, Check, ChevronsUpDown, LoaderCircle, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { isHiddenUserAttributeName } from "@/lib/keycloak-user-attribute-visibility"
import { cn } from "@/lib/utils"

export interface EditableUserState {
  username: string
  firstName: string
  lastName: string
  email: string
  enabled: boolean
  emailVerified: boolean
  requiredActions: string[]
  attributes: Record<string, string[]>
  updateModel?: Record<string, unknown> | null
}

interface UserProfileMetadataAttribute {
  name?: string
  displayName?: string
  required?: boolean | { roles?: string[] }
  readOnly?: boolean
  permissions?: {
    view?: string[]
    edit?: string[]
  }
  multivalued?: boolean
  group?: string
  annotations?: Record<string, string>
  validators?: Record<string, unknown>
  validations?: Record<string, unknown>
}

interface AttributeEntry {
  id: string
  name: string
  label: string
  values: string[]
  keyEditable: boolean
  schemaReadOnly: boolean
  schemaEditable: boolean
  multivalued: boolean
  required: boolean
  metadataDefined: boolean
  inputType: "text" | "textarea" | "select" | "manager-search"
  options: string[]
  groupName: string | null
  helpText: string | null
}

interface ManagerLookupItem {
  id: string
  username: string
  displayName: string
  email: string
  ldapEntryDn: string
}

interface DirectoryOptionLists {
  department: string[]
  workAddress: string[]
}

interface DirectoryOptionListsResponse {
  items: DirectoryOptionLists
}

interface UserEditorDialogProps {
  mode: "create" | "edit"
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: Partial<EditableUserState>
  profileMetadata?: Record<string, unknown> | null
  isSubmitting?: boolean
  onSubmit: (payload: Record<string, unknown>) => Promise<void> | void
}

interface PasswordResetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  username: string
  isSubmitting?: boolean
  onSubmit: (payload: { password: string; temporary: boolean }) => Promise<void> | void
}

const emptyUserState: EditableUserState = {
  username: "",
  firstName: "",
  lastName: "",
  email: "",
  enabled: true,
  emailVerified: false,
  requiredActions: [],
  attributes: {},
  updateModel: null,
}

const coreFieldNames = new Set(["username", "firstName", "lastName", "email"])
const organizationGroupName = "Organization"
const partnerInformationGroupName = "Partner Information"
const userTypeFieldName = "userType"
const defaultCreateRequiredActions = ["UPDATE_PASSWORD", "CONFIGURE_TOTP"]
const defaultEmployeeGroupName = "jira-servicedesk-users"
const emptyDirectoryOptionLists: DirectoryOptionLists = {
  department: [],
  workAddress: [],
}

function stopWheelPropagation(event: WheelEvent<HTMLDivElement>) {
  event.stopPropagation()
}

function createEntryId() {
  return globalThis.crypto?.randomUUID?.() ?? `attribute-${Math.random().toString(36).slice(2, 10)}`
}

function toTitleCase(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ")
}

function normalizeDisplayLabel(value?: string, fallback?: string) {
  const source = value?.trim() || fallback?.trim() || "Attribute"
  return source.replace(/\$\{[^}]+\}/g, "").trim() || toTitleCase(fallback ?? "attribute")
}

function getHelpText(attribute: UserProfileMetadataAttribute) {
  const annotations = attribute.annotations ?? {}
  return (
    annotations["inputHelperTextBefore"] ??
    annotations["inputHelperTextAfter"] ??
    annotations["help-text"] ??
    null
  )
}

function hasAdminPermission(roles?: string[]) {
  if (!roles || roles.length === 0) {
    return true
  }

  return roles.includes("admin")
}

function isRequiredForAdmin(required?: boolean | { roles?: string[] }) {
  if (typeof required === "boolean") {
    return required
  }

  return hasAdminPermission(required?.roles)
}

function isEditableForAdmin(attribute: UserProfileMetadataAttribute) {
  if (attribute.readOnly) {
    return false
  }

  return hasAdminPermission(attribute.permissions?.edit)
}

function isViewableForAdmin(attribute: UserProfileMetadataAttribute) {
  return hasAdminPermission(attribute.permissions?.view)
}

function getAttributeValidationMap(attribute: UserProfileMetadataAttribute) {
  return attribute.validators ?? attribute.validations ?? {}
}

function getFieldOptions(attribute: UserProfileMetadataAttribute) {
  const optionsValidation = getAttributeValidationMap(attribute).options

  if (
    optionsValidation &&
    typeof optionsValidation === "object" &&
    "options" in optionsValidation &&
    Array.isArray((optionsValidation as { options?: unknown }).options)
  ) {
    return ((optionsValidation as { options: unknown[] }).options ?? []).map((option) => String(option))
  }

  return []
}

function getInputType(attribute: UserProfileMetadataAttribute, options: string[]): AttributeEntry["inputType"] {
  if (attribute.name?.trim() === "manager") {
    return "manager-search"
  }

  const configuredType = attribute.annotations?.inputType?.toLowerCase()

  if (configuredType === "select" || options.length > 0) {
    return "select"
  }

  if (configuredType === "textarea") {
    return "textarea"
  }

  return "text"
}

function getMetadataAttributes(profileMetadata?: Record<string, unknown> | null) {
  const rawAttributes = (profileMetadata as { attributes?: unknown } | null)?.attributes

  if (!Array.isArray(rawAttributes)) {
    return []
  }

  return rawAttributes.filter(
    (attribute): attribute is UserProfileMetadataAttribute =>
      Boolean(attribute) && typeof attribute === "object",
  )
}

function getMetadataAttributeByName(
  profileMetadata: Record<string, unknown> | null | undefined,
  name: string,
) {
  return getMetadataAttributes(profileMetadata).find((attribute) => attribute.name === name) ?? null
}

function getEntryFirstValue(entry?: AttributeEntry | null) {
  return entry?.values.find((value) => value.trim())?.trim() ?? ""
}

function shouldHideEntryForCreate(entry: AttributeEntry, selectedUserType: string) {
  if (entry.name === userTypeFieldName) {
    return false
  }

  const groupName = entry.groupName?.trim() ?? ""

  if (groupName !== organizationGroupName && groupName !== partnerInformationGroupName) {
    return false
  }

  if (!selectedUserType) {
    return true
  }

  if (selectedUserType === "employee") {
    return groupName === partnerInformationGroupName
  }

  return groupName === organizationGroupName
}

function buildAttributeEntries(
  attributes: Record<string, string[]>,
  profileMetadata?: Record<string, unknown> | null,
) {
  const metadataAttributes = getMetadataAttributes(profileMetadata)
  const entries: AttributeEntry[] = []
  const seen = new Set<string>()

  metadataAttributes.forEach((attribute) => {
    const name = attribute.name?.trim()

    if (
      !name ||
      isHiddenUserAttributeName(name) ||
      coreFieldNames.has(name) ||
      !isViewableForAdmin(attribute) ||
      !isEditableForAdmin(attribute)
    ) {
      return
    }

    seen.add(name)

    const values = (attributes[name] ?? []).map((value) => value.trim()).filter(Boolean)
    const options = getFieldOptions(attribute)
    const derivedDefaultValue =
      name === "fullName" && values.length === 0
        ? [(attributes.fullName ?? []).join(" ").trim()].filter(Boolean)
        : values
    const normalizedValues = derivedDefaultValue.length > 0 ? derivedDefaultValue : [""]

    entries.push({
      id: createEntryId(),
      name,
      label: normalizeDisplayLabel(attribute.displayName, name),
      values: normalizedValues,
      keyEditable: false,
      schemaReadOnly: Boolean(attribute.readOnly),
      schemaEditable: true,
      multivalued: Boolean(attribute.multivalued),
      required: isRequiredForAdmin(attribute.required),
      metadataDefined: true,
      inputType: getInputType(attribute, options),
      options,
      groupName: attribute.group?.trim() || null,
      helpText: getHelpText(attribute),
    })
  })

  Object.entries(attributes).forEach(([name, values]) => {
    if (isHiddenUserAttributeName(name) || coreFieldNames.has(name) || seen.has(name)) {
      return
    }

    entries.push({
      id: createEntryId(),
      name,
      label: toTitleCase(name),
      values: values.length > 0 ? values : [""],
      keyEditable: false,
      schemaReadOnly: false,
      schemaEditable: true,
      multivalued: values.length > 1,
      required: false,
      metadataDefined: false,
      inputType: "text",
      options: [],
      groupName: null,
      helpText: null,
    })
  })

  return entries
}

function parseRequiredActions(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializeAttributes(entries: AttributeEntry[]) {
  return Object.fromEntries(
    entries.flatMap((entry) => {
      const key = entry.name.trim()
      const values = entry.values.map((value) => value.trim()).filter(Boolean)

      if (!key) {
        return []
      }

      return [[key, values]]
    }),
  )
}

function SearchableSelectField({
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  value: string
  options: string[]
  placeholder: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between rounded-[0.85rem] border-border bg-background px-3 text-left font-normal",
            !value && "text-muted-foreground",
          )}
          disabled={disabled}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onWheelCapture={stopWheelPropagation}
      >
        <Command>
          <CommandInput placeholder="Search options..." />
          <CommandList className="max-h-72 overscroll-contain">
            <CommandEmpty>No matching option.</CommandEmpty>
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={(selectedValue) => {
                  onChange(selectedValue === value ? "" : selectedValue)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === option ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{option}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function getManagerDisplayLabel(value: string, items: ManagerLookupItem[]) {
  const selected = items.find((item) => item.ldapEntryDn === value)

  if (selected) {
    return `${selected.displayName} (${selected.username})`
  }

  const cnMatch = /^CN=([^,]+)/i.exec(value)
  return cnMatch?.[1]?.trim() || value
}

function ManagerLookupField({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [items, setItems] = useState<ManagerLookupItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const trimmedQuery = query.trim()

    if (trimmedQuery.length < 2) {
      setItems([])
      setError(null)
      setIsLoading(false)
      return
    }

    let isActive = true
    const controller = new AbortController()
    const timeoutId = globalThis.setTimeout(async () => {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `/api/keycloak/users/lookup?query=${encodeURIComponent(trimmedQuery)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        )
        const payload = (await response.json().catch(() => null)) as
          | { items?: ManagerLookupItem[]; detail?: string; error?: string }
          | null

        if (!response.ok) {
          throw new Error(payload?.detail ?? payload?.error ?? "Unable to search Keycloak users")
        }

        if (!isActive) {
          return
        }

        setItems(payload?.items ?? [])
      } catch (lookupError) {
        if (!isActive || controller.signal.aborted) {
          return
        }

        setItems([])
        setError(lookupError instanceof Error ? lookupError.message : "Unable to search Keycloak users")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }, 250)

    return () => {
      isActive = false
      controller.abort()
      globalThis.clearTimeout(timeoutId)
    }
  }, [open, query])

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setQuery("")
          setItems([])
          setError(null)
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between rounded-[0.85rem] border-border bg-background px-3 text-left font-normal",
            !value && "text-muted-foreground",
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {value ? getManagerDisplayLabel(value, items) : "Search manager by username or full name"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onWheelCapture={stopWheelPropagation}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search manager by username or full name..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72 overscroll-contain">
            {isLoading ? <CommandEmpty>Searching users...</CommandEmpty> : null}
            {!isLoading && error ? <CommandEmpty>{error}</CommandEmpty> : null}
            {!isLoading && !error && query.trim().length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            ) : null}
            {!isLoading && !error && query.trim().length >= 2 && items.length === 0 ? (
              <CommandEmpty>No matching user found.</CommandEmpty>
            ) : null}
            {items.map((item) => (
              <CommandItem
                key={item.id}
                value={`${item.displayName} ${item.username} ${item.email}`}
                onSelect={() => {
                  onChange(item.ldapEntryDn)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.ldapEntryDn ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.username}
                    {item.email ? ` · ${item.email}` : ""}
                  </p>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function toWireAttributeValue(
  values: string[],
  originalValue: unknown,
  multivalued: boolean,
) {
  if (values.length === 0) {
    return Array.isArray(originalValue) || multivalued ? [] : ""
  }

  if (Array.isArray(originalValue) || multivalued) {
    return values
  }

  return values[0] ?? ""
}

function buildWireAttributes(
  entries: AttributeEntry[],
  rawAttributes: Record<string, unknown>,
) {
  const nextAttributes: Record<string, unknown> = {
    ...rawAttributes,
  }

  entries.forEach((entry) => {
    const key = entry.name.trim()

    if (!key) {
      return
    }

    const values = entry.values.map((value) => value.trim()).filter(Boolean)
    nextAttributes[key] = toWireAttributeValue(values, rawAttributes[key], entry.multivalued)
  })

  return nextAttributes
}

function EntryField({
  entry,
  isSubmitting,
  onNameChange,
  onValueChange,
  onAddValue,
  onRemoveValue,
  onToggleMultivalue,
  onRemoveEntry,
}: {
  entry: AttributeEntry
  isSubmitting: boolean
  onNameChange: (value: string) => void
  onValueChange: (index: number, value: string) => void
  onAddValue: () => void
  onRemoveValue: (index: number) => void
  onToggleMultivalue: (checked: boolean) => void
  onRemoveEntry: () => void
}) {
  return (
    <div className="rounded-[1.1rem] border border-border bg-background p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{entry.label}</p>
          {entry.helpText ? <p className="text-xs text-muted-foreground">{entry.helpText}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!entry.metadataDefined ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Multi value</span>
              <Switch
                checked={entry.multivalued}
                onCheckedChange={onToggleMultivalue}
                disabled={isSubmitting}
              />
            </div>
          ) : null}

          {!entry.metadataDefined ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={onRemoveEntry}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
              Remove field
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {!entry.metadataDefined && entry.keyEditable ? (
          <div className="space-y-2">
            <Label>Attribute key</Label>
            <Input value={entry.name} onChange={(event) => onNameChange(event.target.value)} disabled={isSubmitting} />
          </div>
        ) : null}

        <div className="space-y-3">
          {entry.values.map((value, index) => {
            const sharedProps = {
              disabled: isSubmitting || !entry.schemaEditable,
              value,
              onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                onValueChange(index, event.target.value),
            }

            return (
              <div key={`${entry.id}-${index}`} className="flex items-start gap-3">
                {entry.inputType === "manager-search" ? (
                  <div className="flex-1">
                    <ManagerLookupField
                      value={value}
                      disabled={isSubmitting || !entry.schemaEditable}
                      onChange={(nextValue) => onValueChange(index, nextValue)}
                    />
                  </div>
                ) : entry.inputType === "select" ? (
                  <div className="flex-1">
                    <SearchableSelectField
                      value={value}
                      options={entry.options}
                      placeholder="Select a value"
                      disabled={isSubmitting || !entry.schemaEditable}
                      onChange={(nextValue) => onValueChange(index, nextValue)}
                    />
                  </div>
                ) : entry.inputType === "textarea" ? (
                  <Textarea
                    {...sharedProps}
                    className="min-h-[96px] flex-1"
                  />
                ) : (
                  <Input {...sharedProps} className="flex-1" />
                )}

                {entry.multivalued ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 rounded-xl"
                    onClick={() => onRemoveValue(index)}
                    disabled={isSubmitting || !entry.schemaEditable || entry.values.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            )
          })}

          {entry.multivalued ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onAddValue}
              disabled={isSubmitting || !entry.schemaEditable}
            >
              <Plus className="h-4 w-4" />
              Add value
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function UserEditorDialog({
  mode,
  open,
  onOpenChange,
  initialValue,
  profileMetadata,
  isSubmitting = false,
  onSubmit,
}: UserEditorDialogProps) {
  const [formState, setFormState] = useState<EditableUserState>(emptyUserState)
  const [password, setPassword] = useState("")
  const [temporaryPassword, setTemporaryPassword] = useState(true)
  const [welcomeRecipientEmail, setWelcomeRecipientEmail] = useState("")
  const [workAddress, setWorkAddress] = useState("")
  const [workStartDate, setWorkStartDate] = useState("")
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [availableGroups, setAvailableGroups] = useState<Array<{ id: string; name: string }>>([])
  const [directoryOptionLists, setDirectoryOptionLists] = useState<DirectoryOptionLists>(emptyDirectoryOptionLists)
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupSearchQuery, setGroupSearchQuery] = useState("")
  const [requiredActionsInput, setRequiredActionsInput] = useState("")
  const [attributeEntries, setAttributeEntries] = useState<AttributeEntry[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    const nextState = {
      ...emptyUserState,
      ...initialValue,
    }

    if (mode === "create") {
      nextState.emailVerified = true
      nextState.requiredActions = [...defaultCreateRequiredActions]
    }

    setFormState(nextState)
    setRequiredActionsInput(nextState.requiredActions.join(", "))
    setAttributeEntries(buildAttributeEntries(nextState.attributes, profileMetadata))
    setPassword("")
    setTemporaryPassword(true)
    setWelcomeRecipientEmail("")
    setWorkAddress("")
    setWorkStartDate("")
    setSelectedGroupIds([])
    setGroupSearchQuery("")
    setDirectoryOptionLists(emptyDirectoryOptionLists)
    setFormError(null)

    const loadDirectoryOptions = async () => {
      try {
        const optionsResponse = await fetch("/api/settings/directory-options", { cache: "no-store" })
        const optionData = (await optionsResponse.json().catch(() => null)) as DirectoryOptionListsResponse | null

        if (optionsResponse.ok && optionData?.items) {
          setDirectoryOptionLists({
            department: optionData.items.department ?? [],
            workAddress: optionData.items.workAddress ?? [],
          })
          return
        }

        setDirectoryOptionLists(emptyDirectoryOptionLists)
      } catch {
        setDirectoryOptionLists(emptyDirectoryOptionLists)
      }
    }

    void loadDirectoryOptions()

    // Fetch available groups for selection
    if (mode === "create") {
      const fetchCreateGroups = async () => {
        try {
          setGroupsLoading(true)
          const groupsResponse = await fetch("/api/keycloak/groups?pageSize=100")
          const groupData = (await groupsResponse.json().catch(() => null)) as { items?: Array<{ id?: string; name?: string }> } | null

          if (groupsResponse.ok && groupData?.items) {
            setAvailableGroups(
              groupData.items
                .map((group) => ({ id: group.id ?? "", name: group.name ?? "" }))
                .filter((group) => group.id && group.name)
            )
          } else {
            setAvailableGroups([])
          }
        } catch {
          setAvailableGroups([])
        } finally {
          setGroupsLoading(false)
        }
      }

      void fetchCreateGroups()
    }
  }, [initialValue, open, profileMetadata, mode])

  const userTypeEntry = useMemo(
    () => attributeEntries.find((entry) => entry.name === userTypeFieldName) ?? null,
    [attributeEntries],
  )

  const selectedUserType = useMemo(
    () => getEntryFirstValue(userTypeEntry),
    [userTypeEntry],
  )

  const visibleAttributeEntries = useMemo(() => {
    if (mode !== "create") {
      return attributeEntries
    }

    return attributeEntries.filter((entry) => !shouldHideEntryForCreate(entry, selectedUserType))
  }, [attributeEntries, mode, selectedUserType])

  const resolvedVisibleAttributeEntries = useMemo(() => {
    return visibleAttributeEntries.map((entry) => {
      if (entry.name === "department" && directoryOptionLists.department.length > 0) {
        const currentValues = entry.values.map((value) => value.trim()).filter(Boolean)

        return {
          ...entry,
          inputType: "select" as const,
          options: Array.from(new Set([...currentValues, ...directoryOptionLists.department])),
        }
      }

      return entry
    })
  }, [directoryOptionLists.department, visibleAttributeEntries])

  const metadataDefinedCount = useMemo(
    () => resolvedVisibleAttributeEntries.filter((entry) => entry.metadataDefined).length,
    [resolvedVisibleAttributeEntries],
  )

  const groupedAttributeEntries = useMemo(() => {
    const groups = new Map<string, AttributeEntry[]>()

    resolvedVisibleAttributeEntries
      .filter((entry) => mode !== "create" || entry.name !== userTypeFieldName)
      .forEach((entry) => {
      const groupKey = entry.groupName || (entry.metadataDefined ? "User metadata" : "Custom attributes")
      const current = groups.get(groupKey) ?? []
      current.push(entry)
      groups.set(groupKey, current)
      })

    return Array.from(groups.entries())
  }, [mode, resolvedVisibleAttributeEntries])

  const coreFieldRules = useMemo(() => {
    const usernameMetadata = getMetadataAttributeByName(profileMetadata, "username")
    const emailMetadata = getMetadataAttributeByName(profileMetadata, "email")
    const firstNameMetadata = getMetadataAttributeByName(profileMetadata, "firstName")
    const lastNameMetadata = getMetadataAttributeByName(profileMetadata, "lastName")

    return {
      usernameEditable: usernameMetadata ? isEditableForAdmin(usernameMetadata) : true,
      emailEditable: emailMetadata ? isEditableForAdmin(emailMetadata) : true,
      firstNameEditable: firstNameMetadata ? isEditableForAdmin(firstNameMetadata) : true,
      lastNameEditable: lastNameMetadata ? isEditableForAdmin(lastNameMetadata) : true,
    }
  }, [profileMetadata])

  function updateAttributeEntry(entryId: string, updater: (entry: AttributeEntry) => AttributeEntry) {
    setAttributeEntries((current) =>
      current.map((entry) => (entry.id === entryId ? updater(entry) : entry)),
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setFormError(null)

      const usernameMetadata = getMetadataAttributeByName(profileMetadata, "username")
      const emailMetadata = getMetadataAttributeByName(profileMetadata, "email")
      const firstNameMetadata = getMetadataAttributeByName(profileMetadata, "firstName")
      const lastNameMetadata = getMetadataAttributeByName(profileMetadata, "lastName")

      if (isRequiredForAdmin(usernameMetadata?.required) && !formState.username.trim()) {
        throw new Error("Username is required")
      }

      if (isRequiredForAdmin(emailMetadata?.required) && !formState.email.trim()) {
        throw new Error("Email is required")
      }

      if (isRequiredForAdmin(firstNameMetadata?.required) && !formState.firstName.trim()) {
        throw new Error("First name is required")
      }

      if (isRequiredForAdmin(lastNameMetadata?.required) && !formState.lastName.trim()) {
        throw new Error("Last name is required")
      }

      if (mode === "create" && !selectedUserType) {
        throw new Error("User type is required")
      }

      if (mode === "create" && selectedUserType === "employee" && !welcomeRecipientEmail.trim()) {
        throw new Error("Welcome recipient email is required for employee accounts")
      }

      const normalizedEntries = attributeEntries.map((entry) => {
        if (
          entry.name === "fullName" &&
          entry.values.every((value) => !value.trim())
        ) {
          const derivedFullName = [formState.firstName, formState.lastName].filter(Boolean).join(" ").trim()

          if (derivedFullName) {
            return {
              ...entry,
              values: [derivedFullName],
            }
          }
        }

        return entry
      })

      const missingRequiredField = normalizedEntries.find(
        (entry) =>
          !(mode === "create" && shouldHideEntryForCreate(entry, selectedUserType)) &&
          entry.required &&
          entry.values.every((value) => !value.trim()),
      )

      if (missingRequiredField) {
        throw new Error(`${missingRequiredField.label} is required`)
      }

      const blockedAttribute = normalizedEntries.find((entry) => isHiddenUserAttributeName(entry.name))

      if (blockedAttribute) {
        throw new Error(`${blockedAttribute.name} is managed by Keycloak and cannot be edited`)
      }

      const submitEntries =
        mode === "create"
          ? normalizedEntries.map((entry) =>
              shouldHideEntryForCreate(entry, selectedUserType)
                ? {
                    ...entry,
                    values: [""],
                  }
                : entry,
            )
          : normalizedEntries

      const rawUpdateModel =
        mode === "edit" && formState.updateModel && typeof formState.updateModel === "object"
          ? formState.updateModel
          : null
      const rawAttributes =
        rawUpdateModel?.attributes && typeof rawUpdateModel.attributes === "object" && !Array.isArray(rawUpdateModel.attributes)
          ? (rawUpdateModel.attributes as Record<string, unknown>)
          : {}
      const serializedAttributes = buildWireAttributes(
        submitEntries,
        mode === "edit" ? rawAttributes : {},
      )

      await onSubmit({
        ...(rawUpdateModel ?? {}),
        username: formState.username,
        firstName: formState.firstName,
        lastName: formState.lastName,
        email: formState.email,
        enabled: formState.enabled,
        emailVerified: mode === "create" ? true : formState.emailVerified,
        requiredActions:
          mode === "create"
            ? [...defaultCreateRequiredActions]
            : parseRequiredActions(requiredActionsInput),
        attributes: serializedAttributes,
        ...(mode === "create"
          ? {
              password,
              temporaryPassword,
              workAddress: selectedUserType === "employee" ? workAddress.trim() : "",
              workStartDate: selectedUserType === "employee" ? workStartDate.trim() : "",
              groupIds: selectedGroupIds,
              welcomeRecipientEmail:
                selectedUserType === "employee"
                  ? welcomeRecipientEmail.trim()
                  : formState.email.trim(),
            }
          : {}),
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to process user form")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-border bg-card p-0 sm:max-w-[860px] xl:max-w-[980px]"
      >
        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>{mode === "create" ? "Create Keycloak user" : "Edit Keycloak user"}</SheetTitle>
            <SheetDescription>
              {mode === "create"
                ? "Create a new user in the configured realm with structured profile fields."
                : "Edit the user profile in a full-height workspace with direct form fields instead of raw JSON."}
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-6 pb-6">
              {formError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Form error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              {mode === "create" && userTypeEntry ? (
                <div className="space-y-5">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>User type</Label>
                      {userTypeEntry.inputType === "select" ? (
                        <SearchableSelectField
                          value={getEntryFirstValue(userTypeEntry)}
                          options={userTypeEntry.options}
                          placeholder="Select a user type"
                          disabled={isSubmitting || !userTypeEntry.schemaEditable}
                          onChange={(nextValue) =>
                            updateAttributeEntry(userTypeEntry.id, (current) => ({
                              ...current,
                              values: [nextValue],
                            }))
                          }
                        />
                      ) : (
                        <Input
                          value={getEntryFirstValue(userTypeEntry)}
                          onChange={(event) =>
                            updateAttributeEntry(userTypeEntry.id, (current) => ({
                              ...current,
                              values: [event.target.value],
                            }))
                          }
                          disabled={isSubmitting || !userTypeEntry.schemaEditable}
                          placeholder="Enter a user type"
                        />
                      )}
                      <p className="text-xs text-muted-foreground">
                        Employee accounts show organization fields. Other account types show partner information fields.
                      </p>
                    </div>

                    {selectedUserType === "employee" ? (
                      <div className="space-y-2">
                        <Label htmlFor="create-welcome-recipient-email">Welcome recipient email</Label>
                        <Input
                          id="create-welcome-recipient-email"
                          type="email"
                          value={welcomeRecipientEmail}
                          onChange={(event) => setWelcomeRecipientEmail(event.target.value)}
                          placeholder="manager@company.local"
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          This address is outside the Keycloak user profile and is used for new joiner welcome notification delivery.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-[1rem] border border-border bg-background p-4">
                        <p className="text-sm font-medium text-foreground">Welcome recipient</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          Welcome email will be sent to the user&apos;s email address.
                        </p>
                      </div>
                    )}
                  </div>

                  {selectedUserType === "employee" ? (
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="create-work-address">Work address</Label>
                        {directoryOptionLists.workAddress.length > 0 ? (
                          <SearchableSelectField
                            value={workAddress}
                            options={directoryOptionLists.workAddress}
                            placeholder="Select a work address"
                            disabled={isSubmitting}
                            onChange={setWorkAddress}
                          />
                        ) : (
                          <Input
                            id="create-work-address"
                            value={workAddress}
                            onChange={(event) => setWorkAddress(event.target.value)}
                            placeholder="38 Phan Dinh Phung, Ba Dinh, Ha Noi"
                            disabled={isSubmitting}
                          />
                        )}
                        <p className="text-xs text-muted-foreground">
                          This field is used only in the welcome email and is not written into Keycloak.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="create-work-start-date">Work start date</Label>
                        <Input
                          id="create-work-start-date"
                          type="datetime-local"
                          value={workStartDate}
                          onChange={(event) => setWorkStartDate(event.target.value)}
                          disabled={isSubmitting}
                        />
                        <p className="text-xs text-muted-foreground">
                          This date is used only in the welcome email and is not written into Keycloak.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* Group Selection - Available for all user types */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Assign to groups</Label>
                  {groupsLoading && <span className="text-xs text-muted-foreground">Loading groups...</span>}
                </div>
                {availableGroups.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <Input
                        type="text"
                        placeholder="Search groups..."
                        value={groupSearchQuery}
                        onChange={(event) => setGroupSearchQuery(event.target.value)}
                        disabled={isSubmitting}
                        className="rounded-[0.85rem]"
                      />
                    </div>
                    <div className="space-y-2 rounded-[0.85rem] border border-border bg-background p-4 max-h-[300px] overflow-y-auto">
                      {availableGroups
                        .filter((group) => group.name.toLowerCase().includes(groupSearchQuery.toLowerCase()))
                        .map((group) => (
                          <div key={group.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`group-${group.id}`}
                              checked={selectedGroupIds.includes(group.id)}
                              onChange={(event) => {
                                if (event.target.checked) {
                                  setSelectedGroupIds([...selectedGroupIds, group.id])
                                } else {
                                  setSelectedGroupIds(selectedGroupIds.filter((id) => id !== group.id))
                                }
                              }}
                              disabled={isSubmitting}
                              className="h-4 w-4 rounded border-border"
                            />
                            <Label
                              htmlFor={`group-${group.id}`}
                              className="cursor-pointer flex-1 text-sm font-normal"
                            >
                              {group.name}
                            </Label>
                          </div>
                        ))}
                      {availableGroups.filter((group) => group.name.toLowerCase().includes(groupSearchQuery.toLowerCase())).length === 0 && (
                        <p className="text-xs text-muted-foreground">No matching groups found</p>
                      )}
                    </div>
                  </div>
                ) : !groupsLoading ? (
                  <div className="rounded-[0.85rem] border border-border bg-background p-3">
                    <p className="text-xs text-muted-foreground">No groups available</p>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Select groups to assign this user to. Users will be added to all selected groups upon creation.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-username`}>Username</Label>
                  <Input
                    id={`${mode}-username`}
                    value={formState.username}
                    onChange={(event) => setFormState((current) => ({ ...current, username: event.target.value }))}
                    placeholder="hainh"
                    disabled={isSubmitting || !coreFieldRules.usernameEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-email`}>Email</Label>
                  <Input
                    id={`${mode}-email`}
                    type="email"
                    value={formState.email}
                    onChange={(event) => setFormState((current) => ({ ...current, email: event.target.value }))}
                    placeholder="haninh@mobifonesolutions.vn"
                    disabled={isSubmitting || !coreFieldRules.emailEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-first-name`}>First name</Label>
                  <Input
                    id={`${mode}-first-name`}
                    value={formState.firstName}
                    onChange={(event) => setFormState((current) => ({ ...current, firstName: event.target.value }))}
                    placeholder="Hải"
                    disabled={isSubmitting || !coreFieldRules.firstNameEditable}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-last-name`}>Last name</Label>
                  <Input
                    id={`${mode}-last-name`}
                    value={formState.lastName}
                    onChange={(event) => setFormState((current) => ({ ...current, lastName: event.target.value }))}
                    placeholder="Nguyễn Hoàng"
                    disabled={isSubmitting || !coreFieldRules.lastNameEditable}
                  />
                </div>
              </div>

              {mode === "create" ? (
                <div className="grid gap-5 md:grid-cols-[minmax(0,1fr),240px]">
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <div className="space-y-2">
                      <Label htmlFor="create-password">Initial password</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Leave blank to generate a random password"
                        disabled={isSubmitting}
                      />
                    </div>
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      If left blank, the system creates the user first and then generates a random password
                      through the Keycloak reset-password API.
                    </p>
                  </div>
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Temporary password</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          User must update it on first sign-in.
                        </p>
                      </div>
                      <Switch
                        checked={temporaryPassword}
                        onCheckedChange={setTemporaryPassword}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              <div className={`grid gap-5 ${mode === "create" ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
                <div className="rounded-[1rem] border border-border bg-background p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Enabled</p>
                      <p className="mt-1 text-xs text-muted-foreground">Controls whether the account can sign in.</p>
                    </div>
                    <Switch
                      checked={formState.enabled}
                      onCheckedChange={(checked) => setFormState((current) => ({ ...current, enabled: checked }))}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                {mode === "edit" ? (
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Email verified</p>
                        <p className="mt-1 text-xs text-muted-foreground">Administrative override for email verification state.</p>
                      </div>
                      <Switch
                        checked={formState.emailVerified}
                        onCheckedChange={(checked) => setFormState((current) => ({ ...current, emailVerified: checked }))}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              {mode === "create" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Email verified</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          New accounts are created with email verification enabled by default.
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                      >
                        On
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-[1rem] border border-border bg-background p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">Provisioning defaults</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Default policies are applied automatically when the user is created.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedUserType === "employee" ? (
                          <Badge variant="outline" className="border-border bg-card text-foreground">
                            Group: {defaultEmployeeGroupName}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                            No default group
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-border bg-card text-muted-foreground">
                          Required actions applied automatically
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {mode === "edit" ? (
                <div className="space-y-2">
                  <Label htmlFor={`${mode}-required-actions`}>Required actions</Label>
                  <Input
                    id={`${mode}-required-actions`}
                    value={requiredActionsInput}
                    onChange={(event) => setRequiredActionsInput(event.target.value)}
                    placeholder="UPDATE_PASSWORD, VERIFY_EMAIL"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated actions supported by your realm, such as `UPDATE_PASSWORD` or `VERIFY_EMAIL`.
                  </p>
                </div>
              ) : null}

              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Profile attributes</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {metadataDefinedCount > 0
                        ? "Fields discovered from Keycloak profile metadata are rendered below."
                        : "No structured profile metadata was returned. Existing user attributes are listed below."}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {attributeEntries.length === 0 ? (
                    <div className="rounded-[1.1rem] border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                      No profile attributes are defined for this user yet.
                    </div>
                  ) : (
                    groupedAttributeEntries.map(([groupName, entries]) => (
                      <div key={groupName} className="space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {groupName}
                          </h4>
                        </div>

                        <div className="space-y-4">
                          {entries.map((entry) => (
                            <EntryField
                              key={entry.id}
                              entry={entry}
                              isSubmitting={isSubmitting}
                              onNameChange={(value) =>
                                updateAttributeEntry(entry.id, (current) => ({
                                  ...current,
                                  name: value,
                                  label: current.metadataDefined ? current.label : toTitleCase(value || "Custom attribute"),
                                }))
                              }
                              onValueChange={(index, value) =>
                                updateAttributeEntry(entry.id, (current) => ({
                                  ...current,
                                  values: current.values.map((item, itemIndex) => (itemIndex === index ? value : item)),
                                }))
                              }
                              onAddValue={() =>
                                updateAttributeEntry(entry.id, (current) => ({
                                  ...current,
                                  values: [...current.values, ""],
                                }))
                              }
                              onRemoveValue={(index) =>
                                updateAttributeEntry(entry.id, (current) => ({
                                  ...current,
                                  values:
                                    current.values.length <= 1
                                      ? [""]
                                      : current.values.filter((_, itemIndex) => itemIndex !== index),
                                }))
                              }
                              onToggleMultivalue={(checked) =>
                                updateAttributeEntry(entry.id, (current) => ({
                                  ...current,
                                  multivalued: checked,
                                  values: checked ? current.values : [current.values[0] ?? ""],
                                }))
                              }
                              onRemoveEntry={() =>
                                setAttributeEntries((current) => current.filter((item) => item.id !== entry.id))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border px-6 py-5">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl px-5" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {mode === "create" ? "Create user" : "Save changes"}
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

export function PasswordResetDialog({
  open,
  onOpenChange,
  username,
  isSubmitting = false,
  onSubmit,
}: PasswordResetDialogProps) {
  const [password, setPassword] = useState("")
  const [temporary, setTemporary] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setPassword("")
    setTemporary(true)
    setFormError(null)
  }, [open])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setFormError(null)

      if (!password.trim()) {
        throw new Error("Password is required")
      }

      await onSubmit({
        password: password.trim(),
        temporary,
      })
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to reset password")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full border-l border-border bg-card p-0 sm:max-w-[620px]">
        <form onSubmit={handleSubmit} className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b border-border px-6 py-5">
            <SheetTitle>Reset password</SheetTitle>
            <SheetDescription>
              Set a new password for `{username}` using the Keycloak Admin API.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              {formError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Form error</AlertTitle>
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="reset-password-value">New password</Label>
                <Input
                  id="reset-password-value"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="rounded-[1rem] border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Temporary password</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Force the user to update the password at next login.
                    </p>
                  </div>
                  <Switch checked={temporary} onCheckedChange={setTemporary} disabled={isSubmitting} />
                </div>
              </div>
            </div>
          </div>

          <SheetFooter className="border-t border-border px-6 py-5">
            <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl px-5" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                Reset password
              </Button>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
