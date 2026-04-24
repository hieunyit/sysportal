"use client"

import { type WheelEvent, useEffect, useState } from "react"
import { Check, ChevronsUpDown, LoaderCircle, Plus, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type {
  OpenVpnAccessRoute,
  OpenVpnAccessRule,
  OpenVpnIpService,
} from "@/lib/openvpn-admin"

type DialogMode = "create" | "edit"

export interface EditableOpenVpnUserState {
  name: string
  group: string
  auth_method: string
  admin: boolean
  autologin: boolean
  deny: boolean
  deny_web: boolean
  totp: boolean
  allow_password_change: boolean
  allow_generate_profiles: boolean
  static_ipv4: string
  static_ipv6: string
  cc_commands: string
}

export interface EditableOpenVpnGroupState {
  name: string
  auth_method: string
  admin: boolean
  autologin: boolean
  deny: boolean
  deny_web: boolean
  totp: boolean
  allow_password_change: boolean
  allow_generate_profiles: boolean
  cc_commands: string
}

interface AccessRouteDraft {
  type: OpenVpnAccessRoute["type"]
  accept: boolean
  username: string
  groupname: string
  ipv6: boolean
  netip: string
  prefix_length: string
  servicesText: string
}

interface AccessRuleDraft {
  id?: number
  type: OpenVpnAccessRule["type"]
  match_type: OpenVpnAccessRule["match_type"]
  match_data: string
  action: OpenVpnAccessRule["action"]
  position: string
  comment: string
}

interface KeycloakLookupUser {
  id: string
  username: string
  displayName: string
  email: string
}

const defaultUserState: EditableOpenVpnUserState = {
  name: "",
  group: "",
  auth_method: "",
  admin: false,
  autologin: false,
  deny: false,
  deny_web: false,
  totp: false,
  allow_password_change: false,
  allow_generate_profiles: false,
  static_ipv4: "",
  static_ipv6: "",
  cc_commands: "",
}

const defaultGroupState: EditableOpenVpnGroupState = {
  name: "",
  auth_method: "",
  admin: false,
  autologin: false,
  deny: false,
  deny_web: false,
  totp: false,
  allow_password_change: false,
  allow_generate_profiles: false,
  cc_commands: "",
}

function defaultRouteDraft(): AccessRouteDraft {
  return {
    type: "route",
    accept: true,
    username: "",
    groupname: "",
    ipv6: false,
    netip: "",
    prefix_length: "24",
    servicesText: "",
  }
}

function defaultRuleDraft(position = 100): AccessRuleDraft {
  return {
    type: "domain_routing",
    match_type: "domain_or_subdomain",
    match_data: "",
    action: "route",
    position: String(position),
    comment: "",
  }
}

function routeNeedsSubnet(type: OpenVpnAccessRoute["type"]) {
  return type === "route" || type === "nat"
}

function routeNeedsUser(type: OpenVpnAccessRoute["type"]) {
  return type === "user"
}

function routeNeedsGroup(type: OpenVpnAccessRoute["type"]) {
  return type === "group"
}

function formatServices(services?: OpenVpnIpService[]) {
  if (!services?.length) {
    return ""
  }

  return services
    .map((service) => {
      if (service.protocol === "icmp") {
        return `icmp/${service.type}`
      }

      return service.end_port ? `${service.protocol}/${service.start_port}-${service.end_port}` : `${service.protocol}/${service.start_port}`
    })
    .join("\n")
}

function parseServices(value: string): OpenVpnIpService[] | undefined {
  const items = value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (!items.length) {
    return undefined
  }

  return items.map((item) => {
    const [protocolPart, valuePart] = item.split("/", 2)
    const protocol = protocolPart.trim().toLowerCase()

    if (protocol === "icmp") {
      return {
        protocol: "icmp",
        type: (valuePart || "icmp-any").trim(),
      }
    }

    const [startPort, endPort] = (valuePart || "").split("-", 2)

    return {
      protocol: protocol === "udp" ? "udp" : "tcp",
      start_port: Number(startPort),
      ...(endPort ? { end_port: Number(endPort) } : {}),
    }
  })
}

function routeToDraft(route: OpenVpnAccessRoute): AccessRouteDraft {
  return {
    type: route.type,
    accept: route.accept ?? true,
    username: route.username ?? "",
    groupname: route.groupname ?? "",
    ipv6: route.subnet?.ipv6 ?? false,
    netip: route.subnet?.netip ?? "",
    prefix_length: route.subnet?.prefix_length !== undefined ? String(route.subnet.prefix_length) : "24",
    servicesText: formatServices(route.subnet?.service),
  }
}

function draftToRoute(draft: AccessRouteDraft): OpenVpnAccessRoute {
  return {
    type: draft.type,
    accept: draft.accept,
    ...(routeNeedsUser(draft.type) && draft.username.trim() ? { username: draft.username.trim() } : {}),
    ...(routeNeedsGroup(draft.type) && draft.groupname.trim() ? { groupname: draft.groupname.trim() } : {}),
    ...(routeNeedsSubnet(draft.type) && draft.netip.trim()
      ? {
          subnet: {
            ipv6: draft.ipv6,
            netip: draft.netip.trim(),
            prefix_length: Number(draft.prefix_length || "0"),
            ...(parseServices(draft.servicesText) ? { service: parseServices(draft.servicesText) } : {}),
          },
        }
      : {}),
  }
}

function ruleToDraft(rule: OpenVpnAccessRule): AccessRuleDraft {
  return {
    id: rule.id,
    type: rule.type,
    match_type: rule.match_type,
    match_data: rule.match_data,
    action: rule.action,
    position: String(rule.position),
    comment: rule.comment,
  }
}

function draftToRule(rulesetId: number, draft: AccessRuleDraft): OpenVpnAccessRule {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    ruleset_id: rulesetId,
    type: draft.type,
    match_type: draft.match_type,
    match_data: draft.match_data.trim(),
    action: draft.action,
    position: Number(draft.position || "0"),
    comment: draft.comment.trim(),
  }
}

function FieldSwitch({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (value: boolean) => void
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-center justify-between rounded-lg border border-border/80 bg-muted/10 px-4 py-3"
    >
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

function readErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function stopWheelPropagation(event: WheelEvent<HTMLDivElement>) {
  event.stopPropagation()
}

function SearchableStringSelectField({
  value,
  options,
  placeholder,
  disabled,
  searchPlaceholder,
  emptyText,
  onChange,
}: {
  value: string
  options: string[]
  placeholder: string
  disabled: boolean
  searchPlaceholder: string
  emptyText: string
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
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72 overscroll-contain">
            <CommandEmpty>{emptyText}</CommandEmpty>
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

function KeycloakUserLookupField({
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
  const [items, setItems] = useState<KeycloakLookupUser[]>([])
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
          `/api/keycloak/users/lookup?purpose=openvpn-user&query=${encodeURIComponent(trimmedQuery)}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        )
        const payload = (await response.json().catch(() => null)) as
          | { items?: KeycloakLookupUser[]; detail?: string; error?: string }
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

  const selectedUser = items.find((item) => item.username === value)
  const triggerLabel = selectedUser
    ? `${selectedUser.username} · ${selectedUser.displayName || selectedUser.email || "Keycloak user"}`
    : value || "Search Keycloak username"

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
          <span className="truncate">{triggerLabel}</span>
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
            placeholder="Search Keycloak user by username, name, or email..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-72 overscroll-contain">
            {isLoading ? <CommandEmpty>Searching Keycloak users...</CommandEmpty> : null}
            {!isLoading && error ? <CommandEmpty>{error}</CommandEmpty> : null}
            {!isLoading && !error && query.trim().length < 2 ? (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            ) : null}
            {!isLoading && !error && query.trim().length >= 2 && items.length === 0 ? (
              <CommandEmpty>No matching Keycloak user found.</CommandEmpty>
            ) : null}
            {items.map((item) => (
              <CommandItem
                key={item.id || item.username}
                value={`${item.username} ${item.displayName} ${item.email}`}
                onSelect={() => {
                  onChange(item.username)
                  setOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === item.username ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.username}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.displayName || "Keycloak user"}
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

export function OpenVpnUserEditorDialog({
  mode,
  open,
  pending,
  value,
  onOpenChange,
  onSubmit,
}: {
  mode: DialogMode
  open: boolean
  pending: boolean
  value?: EditableOpenVpnUserState
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: EditableOpenVpnUserState) => Promise<void> | void
}) {
  const [state, setState] = useState<EditableOpenVpnUserState>(value ?? defaultUserState)
  const [availableGroups, setAvailableGroups] = useState<string[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setState(value ?? defaultUserState)
    setSubmitError(null)
  }, [value, open])

  useEffect(() => {
    if (!open) {
      return
    }

    let isActive = true

    async function loadGroups() {
      try {
        setIsLoadingGroups(true)
        const response = await fetch("/api/openvpn/groups?pageSize=50", {
          cache: "no-store",
        })
        const payload = (await response.json().catch(() => null)) as
          | { items?: Array<{ name?: string | null }> }
          | null

        if (!isActive) {
          return
        }

        if (!response.ok) {
          setAvailableGroups([])
          return
        }

        setAvailableGroups(
          Array.from(
            new Set(
              (payload?.items ?? [])
                .map((item) => item.name?.trim() ?? "")
                .filter(Boolean),
            ),
          ),
        )
      } catch {
        if (isActive) {
          setAvailableGroups([])
        }
      } finally {
        if (isActive) {
          setIsLoadingGroups(false)
        }
      }
    }

    void loadGroups()

    return () => {
      isActive = false
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitError(null)

      const normalizedAuthMethod = state.auth_method.trim().toLowerCase()

      if (mode === "create" && !state.name.trim()) {
        throw new Error("Username is required")
      }

      if (!normalizedAuthMethod) {
        throw new Error("Authentication method is required")
      }

      await onSubmit({
        ...state,
        name: state.name.trim(),
        group: state.group.trim(),
        auth_method: normalizedAuthMethod,
        autologin: false,
        deny: false,
        deny_web: false,
        static_ipv4: "",
        static_ipv6: "",
        cc_commands: "",
        totp: normalizedAuthMethod === "local" ? state.totp : false,
        allow_password_change: normalizedAuthMethod === "local" ? state.allow_password_change : false,
      })
    } catch (error) {
      setSubmitError(readErrorMessage(error, "Unable to save the OpenVPN user profile"))
    }
  }

  const usingSaml = state.auth_method.trim().toLowerCase() === "saml"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl border-slate-300/90 dark:border-slate-700/80">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create OpenVPN user" : "Edit OpenVPN user"}</DialogTitle>
          <DialogDescription>
            Manage the core OpenVPN Access Server properties for this user profile.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save user</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="openvpn-user-name">Username</Label>
                  {mode === "create" ? (
                    <KeycloakUserLookupField
                      value={state.name}
                      disabled={pending}
                      onChange={(value) => setState((current) => ({ ...current, name: value }))}
                    />
                  ) : (
                    <Input
                      id="openvpn-user-name"
                      value={state.name}
                      disabled
                      onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Choose an existing identity from Keycloak instead of entering a free-form username.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openvpn-user-group">Primary group</Label>
                  <SearchableStringSelectField
                    value={state.group}
                    disabled={pending}
                    options={availableGroups}
                    placeholder={isLoadingGroups ? "Loading OpenVPN groups..." : "Select existing OpenVPN group"}
                    searchPlaceholder="Search OpenVPN groups..."
                    emptyText={isLoadingGroups ? "Loading OpenVPN groups..." : "No matching OpenVPN group."}
                    onChange={(value) => setState((current) => ({ ...current, group: value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Pick from existing OpenVPN groups. Leave empty if the profile should not inherit a primary group.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openvpn-user-auth-method">Authentication method</Label>
                  <Select
                    value={state.auth_method}
                    disabled={pending}
                    onValueChange={(value) =>
                      setState((current) => ({
                        ...current,
                        auth_method: value,
                        ...(value === "saml"
                          ? {
                              totp: false,
                              allow_password_change: false,
                            }
                          : {}),
                      }))
                    }
                  >
                    <SelectTrigger id="openvpn-user-auth-method">
                      <SelectValue placeholder="Select authentication method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">local</SelectItem>
                      <SelectItem value="saml">saml</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Restrict user creation to the supported OpenVPN methods used in this workspace.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <FieldSwitch
                  id="openvpn-user-admin"
                  label="Administrative access"
                  checked={state.admin}
                  onCheckedChange={(value) => setState((current) => ({ ...current, admin: value }))}
                />
                <FieldSwitch
                  id="openvpn-user-generate-profiles"
                  label="Allow self-service profile generation"
                  checked={state.allow_generate_profiles}
                  onCheckedChange={(value) => setState((current) => ({ ...current, allow_generate_profiles: value }))}
                />
                {!usingSaml ? (
                  <FieldSwitch
                    id="openvpn-user-totp"
                    label="Require TOTP"
                    checked={state.totp}
                    onCheckedChange={(value) => setState((current) => ({ ...current, totp: value }))}
                  />
                ) : null}
                {!usingSaml ? (
                  <FieldSwitch
                    id="openvpn-user-password-change"
                    label="Allow password change"
                    checked={state.allow_password_change}
                    onCheckedChange={(value) => setState((current) => ({ ...current, allow_password_change: value }))}
                  />
                ) : null}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create user" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OpenVpnGroupEditorDialog({
  mode,
  open,
  pending,
  value,
  onOpenChange,
  onSubmit,
}: {
  mode: DialogMode
  open: boolean
  pending: boolean
  value?: EditableOpenVpnGroupState
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: EditableOpenVpnGroupState) => Promise<void> | void
}) {
  const [state, setState] = useState<EditableOpenVpnGroupState>(value ?? defaultGroupState)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setState(value ?? defaultGroupState)
    setSubmitError(null)
  }, [value, open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitError(null)
      await onSubmit({
        ...state,
        name: state.name.trim(),
        auth_method: state.auth_method.trim(),
        cc_commands: state.cc_commands,
      })
    } catch (error) {
      setSubmitError(readErrorMessage(error, "Unable to save the OpenVPN group profile"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl border-slate-300/90 dark:border-slate-700/80">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create OpenVPN group" : "Edit OpenVPN group"}</DialogTitle>
          <DialogDescription>Manage the shared OpenVPN Access Server properties for this group.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save group</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="openvpn-group-name">Group name</Label>
              <Input
                id="openvpn-group-name"
                value={state.name}
                disabled={pending || mode === "edit"}
                onChange={(event) => setState((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openvpn-group-auth-method">Authentication method</Label>
              <Input
                id="openvpn-group-auth-method"
                value={state.auth_method}
                disabled={pending}
                onChange={(event) => setState((current) => ({ ...current, auth_method: event.target.value }))}
                placeholder="local, pam, ldap, saml..."
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FieldSwitch
                id="openvpn-group-admin"
                label="Administrative access"
                checked={state.admin}
                onCheckedChange={(value) => setState((current) => ({ ...current, admin: value }))}
              />
              <FieldSwitch
                id="openvpn-group-autologin"
                label="Allow autologin profiles"
                checked={state.autologin}
                onCheckedChange={(value) => setState((current) => ({ ...current, autologin: value }))}
              />
              <FieldSwitch
                id="openvpn-group-deny"
                label="Deny VPN access"
                checked={state.deny}
                onCheckedChange={(value) => setState((current) => ({ ...current, deny: value }))}
              />
              <FieldSwitch
                id="openvpn-group-deny-web"
                label="Deny web access"
                checked={state.deny_web}
                onCheckedChange={(value) => setState((current) => ({ ...current, deny_web: value }))}
              />
              <FieldSwitch
                id="openvpn-group-totp"
                label="Require TOTP"
                checked={state.totp}
                onCheckedChange={(value) => setState((current) => ({ ...current, totp: value }))}
              />
              <FieldSwitch
                id="openvpn-group-password-change"
                label="Allow password change"
                checked={state.allow_password_change}
                onCheckedChange={(value) => setState((current) => ({ ...current, allow_password_change: value }))}
              />
              <FieldSwitch
                id="openvpn-group-generate-profiles"
                label="Allow self-service profile generation"
                checked={state.allow_generate_profiles}
                onCheckedChange={(value) => setState((current) => ({ ...current, allow_generate_profiles: value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="openvpn-group-cc-commands">Client config commands</Label>
              <Textarea
                id="openvpn-group-cc-commands"
                value={state.cc_commands}
                disabled={pending}
                onChange={(event) => setState((current) => ({ ...current, cc_commands: event.target.value }))}
                placeholder="Optional custom OpenVPN directives"
                className="min-h-32"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create group" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OpenVpnAccessRoutesDialog({
  open,
  pending,
  title,
  description,
  initialRoutes,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  title: string
  description: string
  initialRoutes: OpenVpnAccessRoute[]
  onOpenChange: (open: boolean) => void
  onSubmit: (routes: OpenVpnAccessRoute[]) => Promise<void> | void
}) {
  const [routes, setRoutes] = useState<AccessRouteDraft[]>(initialRoutes.map(routeToDraft))
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setRoutes(initialRoutes.map(routeToDraft))
    setSubmitError(null)
  }, [initialRoutes, open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitError(null)

      for (const [index, route] of routes.entries()) {
        if (routeNeedsUser(route.type) && !route.username.trim()) {
          throw new Error(`Route ${index + 1}: username is required`)
        }

        if (routeNeedsGroup(route.type) && !route.groupname.trim()) {
          throw new Error(`Route ${index + 1}: group name is required`)
        }

        if (routeNeedsSubnet(route.type)) {
          if (!route.netip.trim()) {
            throw new Error(`Route ${index + 1}: network is required`)
          }

          const prefixLength = Number(route.prefix_length)

          if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 128) {
            throw new Error(`Route ${index + 1}: prefix length must be between 0 and 128`)
          }
        }
      }

      await onSubmit(routes.map(draftToRoute))
    } catch (error) {
      setSubmitError(readErrorMessage(error, "Unable to save the OpenVPN access list"))
    }
  }

  function updateRoute(index: number, next: Partial<AccessRouteDraft>) {
    setRoutes((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl border-slate-300/90 dark:border-slate-700/80">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save access list</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {routes.map((route, index) => (
                <div key={`${route.type}-${index}`} className="rounded-lg border border-border/80 bg-muted/10 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Route {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      onClick={() => setRoutes((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Entry type</Label>
                      <Select
                        value={route.type}
                        onValueChange={(value: AccessRouteDraft["type"]) =>
                          updateRoute(index, { type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="route">Route subnet</SelectItem>
                          <SelectItem value="nat">NAT subnet</SelectItem>
                          <SelectItem value="user">Specific user</SelectItem>
                          <SelectItem value="group">Specific group</SelectItem>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="all_vpn_clients">All VPN clients</SelectItem>
                          <SelectItem value="all_s2c_subnets">All site-to-client subnets</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Decision</Label>
                      <Select
                        value={route.accept ? "allow" : "deny"}
                        onValueChange={(value) => updateRoute(index, { accept: value === "allow" })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allow">Allow</SelectItem>
                          <SelectItem value="deny">Deny</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {routeNeedsUser(route.type) ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label>User name</Label>
                        <Input
                          value={route.username}
                          onChange={(event) => updateRoute(index, { username: event.target.value })}
                          disabled={pending}
                        />
                      </div>
                    ) : null}

                    {routeNeedsGroup(route.type) ? (
                      <div className="space-y-2 md:col-span-2">
                        <Label>Group name</Label>
                        <Input
                          value={route.groupname}
                          onChange={(event) => updateRoute(index, { groupname: event.target.value })}
                          disabled={pending}
                        />
                      </div>
                    ) : null}

                    {routeNeedsSubnet(route.type) ? (
                      <>
                        <div className="space-y-2">
                          <Label>Network</Label>
                          <Input
                            value={route.netip}
                            onChange={(event) => updateRoute(index, { netip: event.target.value })}
                            disabled={pending}
                            placeholder="10.20.30.0"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Prefix length</Label>
                          <Input
                            value={route.prefix_length}
                            onChange={(event) => updateRoute(index, { prefix_length: event.target.value })}
                            disabled={pending}
                            placeholder="24"
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Service filters</Label>
                          <Textarea
                            value={route.servicesText}
                            onChange={(event) => updateRoute(index, { servicesText: event.target.value })}
                            disabled={pending}
                            className="min-h-28"
                            placeholder={"tcp/443\nudp/1194\nicmp/icmp-any"}
                          />
                          <p className="text-xs text-muted-foreground">
                            Optional. One rule per line. Use <code>tcp/443</code>, <code>udp/2000-2999</code>, or <code>icmp/icmp-any</code>.
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <FieldSwitch
                            id={`openvpn-route-ipv6-${index}`}
                            label="IPv6 subnet"
                            checked={route.ipv6}
                            onCheckedChange={(value) => updateRoute(index, { ipv6: value })}
                          />
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="rounded-lg bg-transparent"
                onClick={() => setRoutes((current) => [...current, defaultRouteDraft()])}
                disabled={pending}
              >
                <Plus className="h-4 w-4" />
                Add route
              </Button>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Save access list
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OpenVpnRulesetDialog({
  mode,
  open,
  pending,
  value,
  includePosition = false,
  onOpenChange,
  onSubmit,
}: {
  mode: DialogMode
  open: boolean
  pending: boolean
  value?: { name: string; comment: string; position?: number | null }
  includePosition?: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { name: string; comment: string; position?: number }) => Promise<void> | void
}) {
  const [name, setName] = useState(value?.name ?? "")
  const [comment, setComment] = useState(value?.comment ?? "")
  const [position, setPosition] = useState(value?.position ? String(value.position) : "")
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setName(value?.name ?? "")
    setComment(value?.comment ?? "")
    setPosition(value?.position ? String(value.position) : "")
    setSubmitError(null)
  }, [value, open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitError(null)

      if (!name.trim()) {
        throw new Error("Ruleset name is required")
      }

      if (includePosition && position.trim()) {
        const parsedPosition = Number(position)

        if (!Number.isInteger(parsedPosition) || parsedPosition < 0) {
          throw new Error("Assignment position must be a non-negative integer")
        }
      }

      await onSubmit({
        name: name.trim(),
        comment: comment.trim(),
        ...(includePosition && position.trim() ? { position: Number(position) } : {}),
      })
    } catch (error) {
      setSubmitError(readErrorMessage(error, "Unable to save the ruleset"))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl border-slate-300/90 dark:border-slate-700/80">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create domain ruleset" : "Edit domain ruleset"}</DialogTitle>
          <DialogDescription>
            Rulesets are then assigned to the selected OpenVPN user or group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save ruleset</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="openvpn-ruleset-name">Ruleset name</Label>
            <Input
              id="openvpn-ruleset-name"
              value={name}
              disabled={pending}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="openvpn-ruleset-comment">Comment</Label>
            <Textarea
              id="openvpn-ruleset-comment"
              value={comment}
              disabled={pending}
              onChange={(event) => setComment(event.target.value)}
              className="min-h-28"
            />
          </div>

          {includePosition ? (
            <div className="space-y-2">
              <Label htmlFor="openvpn-ruleset-position">Assignment position</Label>
              <Input
                id="openvpn-ruleset-position"
                value={position}
                disabled={pending}
                onChange={(event) => setPosition(event.target.value)}
                placeholder="Optional"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {mode === "create" ? "Create ruleset" : "Save ruleset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function OpenVpnRulesDialog({
  open,
  pending,
  rulesetName,
  rulesetId,
  initialRules,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  rulesetName: string
  rulesetId: number
  initialRules: OpenVpnAccessRule[]
  onOpenChange: (open: boolean) => void
  onSubmit: (rules: OpenVpnAccessRule[]) => Promise<void> | void
}) {
  const [rules, setRules] = useState<AccessRuleDraft[]>(initialRules.map(ruleToDraft))
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    setRules(initialRules.map(ruleToDraft))
    setSubmitError(null)
  }, [initialRules, open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      setSubmitError(null)

      for (const [index, rule] of rules.entries()) {
        if (!rule.match_data.trim()) {
          throw new Error(`Rule ${index + 1}: domain match is required`)
        }

        const parsedPosition = Number(rule.position)

        if (!Number.isInteger(parsedPosition) || parsedPosition < 0) {
          throw new Error(`Rule ${index + 1}: position must be a non-negative integer`)
        }
      }

      await onSubmit(rules.map((rule) => draftToRule(rulesetId, rule)))
    } catch (error) {
      setSubmitError(readErrorMessage(error, "Unable to save the domain rules"))
    }
  }

  function updateRule(index: number, next: Partial<AccessRuleDraft>) {
    setRules((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...next } : item)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl border-slate-300/90 dark:border-slate-700/80">
        <DialogHeader>
          <DialogTitle>Edit domain rules</DialogTitle>
          <DialogDescription>{rulesetName}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {submitError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save rules</AlertTitle>
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={`${rule.id ?? "new"}-${index}`} className="rounded-lg border border-border/80 bg-muted/10 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Rule {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      onClick={() => setRules((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Rule type</Label>
                      <Select value={rule.type} onValueChange={(value: AccessRuleDraft["type"]) => updateRule(index, { type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="domain_routing">Domain routing</SelectItem>
                          <SelectItem value="filter">Filter</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Match type</Label>
                      <Select
                        value={rule.match_type}
                        onValueChange={(value: AccessRuleDraft["match_type"]) => updateRule(index, { match_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="domain">Domain</SelectItem>
                          <SelectItem value="not_domain">Not domain</SelectItem>
                          <SelectItem value="subdomain">Subdomain</SelectItem>
                          <SelectItem value="not_subdomain">Not subdomain</SelectItem>
                          <SelectItem value="domain_or_subdomain">Domain or subdomain</SelectItem>
                          <SelectItem value="not_domain_or_subdomain">Not domain or subdomain</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Action</Label>
                      <Select
                        value={rule.action}
                        onValueChange={(value: AccessRuleDraft["action"]) => updateRule(index, { action: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="route">Route</SelectItem>
                          <SelectItem value="nat">NAT</SelectItem>
                          <SelectItem value="deny">Deny</SelectItem>
                          <SelectItem value="bypass">Bypass</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2 xl:col-span-2">
                      <Label>Domain match</Label>
                      <Input
                        value={rule.match_data}
                        disabled={pending}
                        onChange={(event) => updateRule(index, { match_data: event.target.value })}
                        placeholder="example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Position</Label>
                      <Input
                        value={rule.position}
                        disabled={pending}
                        onChange={(event) => updateRule(index, { position: event.target.value })}
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2 xl:col-span-3">
                      <Label>Comment</Label>
                      <Input
                        value={rule.comment}
                        disabled={pending}
                        onChange={(event) => updateRule(index, { comment: event.target.value })}
                        placeholder="Optional operator note"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="rounded-lg bg-transparent"
                onClick={() => setRules((current) => [...current, defaultRuleDraft((current.length + 1) * 100)])}
                disabled={pending}
              >
                <Plus className="h-4 w-4" />
                Add rule
              </Button>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              Save rules
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
