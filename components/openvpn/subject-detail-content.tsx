"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  Globe2,
  LoaderCircle,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  OpenVpnConsoleShell,
  OpenVpnPanel,
} from "@/components/openvpn/openvpn-console-shell"
import type {
  OpenVpnAccessRoute,
  OpenVpnAccessRule,
  OpenVpnAccessRuleset,
  OpenVpnGroupProfile,
  OpenVpnUserProfile,
} from "@/lib/openvpn-admin"
import {
  getBooleanPropValue,
  getStringPropValue,
  type OpenVpnSubjectType,
} from "@/lib/openvpn-directory"
import {
  OpenVpnAccessRoutesDialog,
  OpenVpnGroupEditorDialog,
  OpenVpnRulesDialog,
  OpenVpnRulesetDialog,
  OpenVpnUserEditorDialog,
  type EditableOpenVpnGroupState,
  type EditableOpenVpnUserState,
} from "@/components/openvpn/openvpn-management-dialogs"

interface OpenVpnDetailRuleset extends OpenVpnAccessRuleset {
  rules: OpenVpnAccessRule[]
}

interface OpenVpnSubjectDetailResponse {
  subjectType: OpenVpnSubjectType
  name: string
  profile: OpenVpnUserProfile | OpenVpnGroupProfile
  accessLists: Record<"access_from_ipv6" | "access_from_ipv4" | "access_to_ipv4" | "access_to_ipv6", OpenVpnAccessRoute[]>
  rulesets: OpenVpnDetailRuleset[]
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
  const issues = response.issues
    ?.map((issue) => {
      const path = issue.path?.trim()
      const message = issue.message?.trim()
      return path ? `${path}: ${message}` : message
    })
    .filter(Boolean)
    .join("; ")

  return response.detail ?? issues ?? response.error ?? fallback
}

function formatAccessListLabel(
  value: "access_from_ipv6" | "access_from_ipv4" | "access_to_ipv4" | "access_to_ipv6",
) {
  switch (value) {
    case "access_from_ipv4":
      return "Access from IPv4"
    case "access_from_ipv6":
      return "Access from IPv6"
    case "access_to_ipv4":
      return "Access to IPv4"
    case "access_to_ipv6":
      return "Access to IPv6"
  }
}

function describeAccessRoute(route: OpenVpnAccessRoute) {
  switch (route.type) {
    case "user":
      return route.username ?? "Specific user"
    case "group":
      return route.groupname ?? "Specific group"
    case "route":
    case "nat":
      if (!route.subnet) {
        return route.type
      }

      return `${route.subnet.netip}/${route.subnet.prefix_length}${route.subnet.ipv6 ? " (IPv6)" : ""}`
    case "all":
      return "All traffic"
    case "all_vpn_clients":
      return "All VPN clients"
    case "all_s2c_subnets":
      return "All site-to-client subnets"
  }
}

function describeAccessRouteServices(route: OpenVpnAccessRoute) {
  if (!route.subnet?.service?.length) {
    return "Any service"
  }

  return route.subnet.service
    .map((service) => {
      if (service.protocol === "icmp") {
        return `icmp/${service.type}`
      }

      return service.end_port
        ? `${service.protocol}/${service.start_port}-${service.end_port}`
        : `${service.protocol}/${service.start_port}`
    })
    .join(", ")
}

function toEditableUserState(profile: OpenVpnUserProfile): EditableOpenVpnUserState {
  return {
    name: profile.name,
    group: profile.group ?? "",
    auth_method: getStringPropValue(profile.auth_method) ?? "",
    admin: getBooleanPropValue(profile.admin) ?? false,
    autologin: getBooleanPropValue(profile.autologin) ?? false,
    deny: getBooleanPropValue(profile.deny) ?? false,
    deny_web: getBooleanPropValue(profile.deny_web) ?? false,
    totp: getBooleanPropValue(profile.totp) ?? false,
    allow_password_change: getBooleanPropValue(profile.allow_password_change) ?? false,
    allow_generate_profiles: getBooleanPropValue(profile.allow_generate_profiles) ?? false,
    static_ipv4: profile.static_ipv4 ?? "",
    static_ipv6: profile.static_ipv6 ?? "",
    cc_commands: getStringPropValue(profile.cc_commands) ?? "",
  }
}

function toEditableGroupState(profile: OpenVpnGroupProfile): EditableOpenVpnGroupState {
  return {
    name: profile.name,
    auth_method: getStringPropValue(profile.auth_method) ?? "",
    admin: getBooleanPropValue(profile.admin) ?? false,
    autologin: getBooleanPropValue(profile.autologin) ?? false,
    deny: getBooleanPropValue(profile.deny) ?? false,
    deny_web: getBooleanPropValue(profile.deny_web) ?? false,
    totp: getBooleanPropValue(profile.totp) ?? false,
    allow_password_change: getBooleanPropValue(profile.allow_password_change) ?? false,
    allow_generate_profiles: getBooleanPropValue(profile.allow_generate_profiles) ?? false,
    cc_commands: getStringPropValue(profile.cc_commands) ?? "",
  }
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="grid gap-1 border-b border-border/70 py-3 last:border-b-0 sm:grid-cols-[11rem,1fr] sm:items-start sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}

type QuickRuleProtocol = "all" | "tcp" | "udp" | "icmp"

interface QuickAccessRuleDraft {
  address: string
  protocol: QuickRuleProtocol
  port: string
  reachableVia: "nat" | "route"
}

interface QuickAccessRuleItem {
  id: string
  kind: "domain" | "network"
  destination: string
  sourceLabel: string
  protocolLabel: string
  protocol: QuickRuleProtocol
  portLabel: string
  port: string
  reachableVia: "nat" | "route" | "deny" | "bypass"
  editable: boolean
  editReason?: string
  listType?: "access_from_ipv6" | "access_from_ipv4" | "access_to_ipv4" | "access_to_ipv6"
  routeIndex?: number
  rulesetId?: number
  ruleId?: number
}

const defaultQuickRuleDraft: QuickAccessRuleDraft = {
  address: "",
  protocol: "all",
  port: "",
  reachableVia: "nat",
}

function isIpv4Candidate(value: string) {
  return /^(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?$/.test(value.trim())
}

function isIpv6Candidate(value: string) {
  return value.includes(":")
}

function isIpOrCidr(value: string) {
  return isIpv4Candidate(value) || isIpv6Candidate(value)
}

function normalizeNetworkInput(value: string) {
  const trimmed = value.trim()
  const [netip, prefix] = trimmed.split("/", 2)
  const ipv6 = isIpv6Candidate(trimmed)

  return {
    ipv6,
    netip,
    prefixLength: prefix ? Number(prefix) : ipv6 ? 128 : 32,
  }
}

function summarizeRouteService(route: OpenVpnAccessRoute) {
  if (!route.subnet?.service?.length) {
    return {
      protocol: "all" as const,
      protocolLabel: "All",
      port: "",
      portLabel: "All",
      editable: true,
    }
  }

  if (route.subnet.service.length !== 1) {
    return {
      protocol: "all" as const,
      protocolLabel: "Multiple",
      port: "",
      portLabel: "Multiple",
      editable: false,
      editReason: "Multiple service filters can still be edited in the advanced panel below.",
    }
  }

  const service = route.subnet.service[0]

  if (service.protocol === "icmp") {
    return {
      protocol: "icmp" as const,
      protocolLabel: "ICMP",
      port: "",
      portLabel: "All",
      editable: true,
    }
  }

  const port = service.end_port ? `${service.start_port}-${service.end_port}` : String(service.start_port)

  return {
    protocol: service.protocol,
    protocolLabel: service.protocol.toUpperCase(),
    port,
    portLabel: port,
    editable: true,
  }
}

function buildQuickAccessItems(data: OpenVpnSubjectDetailResponse): QuickAccessRuleItem[] {
  const networkItems: QuickAccessRuleItem[] = (
    [
      "access_to_ipv4",
      "access_to_ipv6",
    ] as const
  ).flatMap((listType) =>
    data.accessLists[listType]
      .map((route, routeIndex) => {
        if (route.type !== "route" && route.type !== "nat") {
          return null
        }

        const service = summarizeRouteService(route)
        const destination = route.subnet ? `${route.subnet.netip}/${route.subnet.prefix_length}` : describeAccessRoute(route)

        return {
          id: `network:${listType}:${routeIndex}`,
          kind: "network",
          destination,
          sourceLabel: data.name,
          protocolLabel: service.protocolLabel,
          protocol: service.protocol,
          portLabel: service.portLabel,
          port: service.port,
          reachableVia: route.type,
          editable: service.editable,
          editReason: service.editReason,
          listType,
          routeIndex,
        } satisfies QuickAccessRuleItem
      })
      .filter((item): item is QuickAccessRuleItem => Boolean(item)),
  )

  const domainItems: QuickAccessRuleItem[] = data.rulesets.flatMap((ruleset) =>
    ruleset.rules
      .map((rule) => {
        if (rule.type !== "domain_routing") {
          return null
        }

        const editable = rule.action === "nat" || rule.action === "route"

        return {
          id: `domain:${ruleset.id}:${rule.id ?? rule.position}`,
          kind: "domain",
          destination: rule.match_data,
          sourceLabel: data.name,
          protocolLabel: "All",
          protocol: "all",
          portLabel: "All",
          port: "",
          reachableVia: rule.action,
          editable,
          editReason: editable ? undefined : "Only NAT and Route actions are editable from the quick board.",
          rulesetId: ruleset.id,
          ruleId: rule.id,
        } satisfies QuickAccessRuleItem
      })
      .filter((item): item is QuickAccessRuleItem => Boolean(item)),
  )

  return [...domainItems, ...networkItems]
}

export function OpenVpnSubjectDetailContent({
  subjectType,
  name,
}: {
  subjectType: OpenVpnSubjectType
  name: string
}) {
  const routeBase = subjectType === "user" ? "/openvpn/users" : "/openvpn/groups"
  const apiBase = `/api/openvpn/${subjectType === "user" ? "users" : "groups"}/${encodeURIComponent(name)}`

  const [data, setData] = useState<OpenVpnSubjectDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingAccessList, setEditingAccessList] = useState<
    "access_from_ipv6" | "access_from_ipv4" | "access_to_ipv4" | "access_to_ipv6" | null
  >(null)
  const [isCreateRulesetOpen, setIsCreateRulesetOpen] = useState(false)
  const [editingRulesetId, setEditingRulesetId] = useState<number | null>(null)
  const [editingRulesId, setEditingRulesId] = useState<number | null>(null)
  const [quickDraft, setQuickDraft] = useState<QuickAccessRuleDraft>(defaultQuickRuleDraft)
  const [editingQuickRuleId, setEditingQuickRuleId] = useState<string | null>(null)
  const [quickError, setQuickError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadDetail() {
      try {
        setIsLoading(true)
        const response = await fetch(apiBase, { cache: "no-store" })
        const payload = await response.json()

        if (!response.ok) {
          throw new Error(readErrorMessage(payload, `Unable to load OpenVPN ${subjectType}`))
        }

        if (!isActive) {
          return
        }

        setData(payload as OpenVpnSubjectDetailResponse)
        setError(null)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError instanceof Error ? loadError.message : `Unable to load OpenVPN ${subjectType}`)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      isActive = false
    }
  }, [apiBase, refreshKey, subjectType])

  const selectedRuleset = useMemo(
    () => data?.rulesets.find((ruleset) => ruleset.id === editingRulesetId) ?? null,
    [data?.rulesets, editingRulesetId],
  )
  const selectedRulesetForRules = useMemo(
    () => data?.rulesets.find((ruleset) => ruleset.id === editingRulesId) ?? null,
    [data?.rulesets, editingRulesId],
  )
  const quickAccessItems = useMemo(() => (data ? buildQuickAccessItems(data) : []), [data])
  const editingQuickRule = useMemo(
    () => quickAccessItems.find((item) => item.id === editingQuickRuleId) ?? null,
    [editingQuickRuleId, quickAccessItems],
  )

  function resetQuickEditor() {
    setQuickDraft(defaultQuickRuleDraft)
    setEditingQuickRuleId(null)
    setQuickError(null)
  }

  function startQuickEdit(item: QuickAccessRuleItem) {
    setEditingQuickRuleId(item.id)
    setQuickError(item.editReason ?? null)
    setQuickDraft({
      address: item.destination,
      protocol: item.kind === "domain" ? "all" : item.protocol,
      port: item.kind === "domain" ? "" : item.port,
      reachableVia: item.reachableVia === "route" ? "route" : "nat",
    })
  }

  async function runMutation(label: string, input: () => Promise<Response>) {
    try {
      setPendingAction(label)
      setFeedback(null)
      const response = await input()
      const payload = response.status === 204 ? null : await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(readErrorMessage(payload, label))
      }

      setFeedback({
        tone: "success",
        message: label,
      })
      setRefreshKey((current) => current + 1)
    } catch (mutationError) {
      setFeedback({
        tone: "error",
        message: mutationError instanceof Error ? mutationError.message : label,
      })
      throw mutationError
    } finally {
      setPendingAction(null)
    }
  }

  async function expectOpenVpnResponse(response: Response, fallback: string) {
    const payload = response.status === 204 ? null : await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(readErrorMessage(payload, fallback))
    }

    return payload
  }

  async function handleSaveUserProfile(payload: EditableOpenVpnUserState) {
    await runMutation("OpenVPN user updated", () =>
      fetch(apiBase, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    )
    setIsEditOpen(false)
  }

  async function handleSaveGroupProfile(payload: EditableOpenVpnGroupState) {
    await runMutation("OpenVPN group updated", () =>
      fetch(apiBase, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    )
    setIsEditOpen(false)
  }

  async function handleSaveAccessList(listType: NonNullable<typeof editingAccessList>, routes: OpenVpnAccessRoute[]) {
    await runMutation(`${formatAccessListLabel(listType)} updated`, () =>
      fetch(`${apiBase}/access-routes/${listType}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ routes }),
      }),
    )
    setEditingAccessList(null)
  }

  async function handleCreateRuleset(payload: { name: string; comment: string; position?: number }) {
    await runMutation("Domain ruleset created", () =>
      fetch(`${apiBase}/rulesets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    )
    setIsCreateRulesetOpen(false)
  }

  async function handleUpdateRuleset(rulesetId: number, payload: { name: string; comment: string }) {
    await runMutation("Domain ruleset updated", () =>
      fetch(`/api/openvpn/rulesets/${rulesetId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }),
    )
    setEditingRulesetId(null)
  }

  async function handleSaveRules(rulesetId: number, rules: OpenVpnAccessRule[]) {
    await runMutation("Domain rules updated", () =>
      fetch(`/api/openvpn/rulesets/${rulesetId}/rules`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rules }),
      }),
    )
    setEditingRulesId(null)
  }

  async function handleUnassignRuleset(rulesetId: number) {
    await runMutation("Ruleset unassigned", () =>
      fetch(`${apiBase}/rulesets/${rulesetId}`, {
        method: "DELETE",
      }),
    )
  }

  async function handleDeleteRuleset(rulesetId: number) {
    await runMutation("Ruleset deleted", () =>
      fetch(`/api/openvpn/rulesets/${rulesetId}`, {
        method: "DELETE",
      }),
    )
  }

  async function handleQuickRuleSave() {
    if (!data) {
      return
    }

    const address = quickDraft.address.trim()

    if (!address) {
      setQuickError("Destination is required")
      return
    }

    try {
      setPendingAction("Saving access rule")
      setQuickError(null)
      setFeedback(null)

      if (isIpOrCidr(address)) {
        const network = normalizeNetworkInput(address)
        const targetListType = network.ipv6 ? "access_to_ipv6" : "access_to_ipv4"
        const nextRoute: OpenVpnAccessRoute = {
          type: quickDraft.reachableVia,
          accept: true,
          subnet: {
            ipv6: network.ipv6,
            netip: network.netip,
            prefix_length: network.prefixLength,
            ...(quickDraft.protocol === "all"
              ? {}
              : quickDraft.protocol === "icmp"
                ? {
                    service: [{ protocol: "icmp", type: "icmp-any" }],
                  }
                : quickDraft.port.trim()
                  ? {
                      service: [
                        quickDraft.port.includes("-")
                          ? {
                              protocol: quickDraft.protocol,
                              start_port: Number(quickDraft.port.split("-", 2)[0]),
                              end_port: Number(quickDraft.port.split("-", 2)[1]),
                            }
                          : {
                              protocol: quickDraft.protocol,
                              start_port: Number(quickDraft.port),
                            },
                      ],
                    }
                  : {}),
          },
        }

        if (quickDraft.protocol !== "all" && quickDraft.protocol !== "icmp" && !quickDraft.port.trim()) {
          throw new Error("Port is required when protocol is TCP or UDP")
        }

        if (quickDraft.port.trim() && !/^\d+(-\d+)?$/.test(quickDraft.port.trim())) {
          throw new Error("Port must be a single value like 443 or a range like 2000-2999")
        }

        const requests: Array<Promise<Response>> = []

        if (editingQuickRule?.kind === "network" && editingQuickRule.listType) {
          const previousRoutes = [...data.accessLists[editingQuickRule.listType]]

          if (typeof editingQuickRule.routeIndex === "number") {
            previousRoutes.splice(editingQuickRule.routeIndex, 1)
          }

          requests.push(
            fetch(`${apiBase}/access-routes/${editingQuickRule.listType}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ routes: previousRoutes }),
            }),
          )
        }

        const nextRoutes = [...data.accessLists[targetListType]]

        if (editingQuickRule?.kind === "network" && editingQuickRule.listType === targetListType && typeof editingQuickRule.routeIndex === "number") {
          nextRoutes[editingQuickRule.routeIndex] = nextRoute
        } else {
          nextRoutes.push(nextRoute)
        }

        requests.push(
          fetch(`${apiBase}/access-routes/${targetListType}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ routes: nextRoutes }),
          }),
        )

        for (const requestPromise of requests) {
          const response = await requestPromise
          await expectOpenVpnResponse(response, "Unable to save the OpenVPN access rule")
        }
      } else {
        let targetRulesetId = editingQuickRule?.rulesetId ?? data.rulesets[0]?.id
        let targetRules = targetRulesetId
          ? [...(data.rulesets.find((ruleset) => ruleset.id === targetRulesetId)?.rules ?? [])]
          : []

        if (!targetRulesetId) {
          const createdRuleset = await fetch(`${apiBase}/rulesets`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: `${data.name} quick access`,
              comment: "",
            }),
          })

          const createdPayload = (await expectOpenVpnResponse(
            createdRuleset,
            "Unable to create a default domain ruleset",
          )) as { id?: number } | null

          if (!createdPayload?.id) {
            throw new Error("OpenVPN did not return a ruleset id for the new quick access ruleset")
          }

          targetRulesetId = createdPayload.id
          targetRules = []
        }

        const nextRule: OpenVpnAccessRule = {
          ...(editingQuickRule?.ruleId ? { id: editingQuickRule.ruleId } : {}),
          ruleset_id: targetRulesetId,
          type: "domain_routing",
          match_type: "domain_or_subdomain",
          match_data: address,
          action: quickDraft.reachableVia,
          position:
            editingQuickRule?.kind === "domain"
              ? targetRules.find((rule) => rule.id === editingQuickRule.ruleId)?.position ?? 100
              : Math.max(0, ...targetRules.map((rule) => rule.position)) + 100,
          comment: "",
        }

        const updatedRules =
          editingQuickRule?.kind === "domain" && editingQuickRule.ruleId
            ? targetRules.map((rule) => (rule.id === editingQuickRule.ruleId ? nextRule : rule))
            : [...targetRules, nextRule]

        const response = await fetch(`/api/openvpn/rulesets/${targetRulesetId}/rules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: updatedRules }),
        })

        await expectOpenVpnResponse(response, "Unable to save the OpenVPN domain rule")
      }

      setFeedback({
        tone: "success",
        message: "Access rule saved",
      })
      setRefreshKey((current) => current + 1)
      resetQuickEditor()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the access rule"
      setQuickError(message)
      setFeedback({
        tone: "error",
        message,
      })
    } finally {
      setPendingAction(null)
    }
  }

  async function handleQuickRuleDelete(item: QuickAccessRuleItem) {
    if (!data) {
      return
    }

    try {
      setPendingAction("Deleting access rule")
      setQuickError(null)
      setFeedback(null)

      if (item.kind === "network" && item.listType && typeof item.routeIndex === "number") {
        const nextRoutes = [...data.accessLists[item.listType]]
        nextRoutes.splice(item.routeIndex, 1)

        const response = await fetch(`${apiBase}/access-routes/${item.listType}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routes: nextRoutes }),
        })

        await expectOpenVpnResponse(response, "Unable to delete the OpenVPN access rule")
      } else if (item.kind === "domain" && item.rulesetId && item.ruleId) {
        const ruleset = data.rulesets.find((entry) => entry.id === item.rulesetId)
        const nextRules = (ruleset?.rules ?? []).filter((rule) => rule.id !== item.ruleId)
        const response = await fetch(`/api/openvpn/rulesets/${item.rulesetId}/rules`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: nextRules }),
        })

        await expectOpenVpnResponse(response, "Unable to delete the OpenVPN domain rule")
      }

      setFeedback({
        tone: "success",
        message: "Access rule deleted",
      })
      setRefreshKey((current) => current + 1)
      if (editingQuickRuleId === item.id) {
        resetQuickEditor()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete the access rule"
      setFeedback({
        tone: "error",
        message,
      })
    } finally {
      setPendingAction(null)
    }
  }

  if (isLoading) {
    return (
      <OpenVpnConsoleShell
        title={`Loading ${subjectType === "user" ? "user" : "group"} permissions`}
        description="Retrieving profile properties, explicit access lists, and assigned domain rulesets from OpenVPN Access Server."
        context={`Access Controls / ${subjectType === "user" ? "Users" : "Groups"}`}
      >
        <OpenVpnPanel title="OpenVPN permissions" bodyClassName="p-0">
          <div className="flex min-h-[360px] items-center justify-center bg-muted/10">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Loading OpenVPN {subjectType} detail...
            </div>
          </div>
        </OpenVpnPanel>
      </OpenVpnConsoleShell>
    )
  }

  if (error || !data) {
    return (
      <OpenVpnConsoleShell
        title="OpenVPN detail unavailable"
        description="The requested OpenVPN subject could not be loaded from Access Server."
        context={`Access Controls / ${subjectType === "user" ? "Users" : "Groups"}`}
        actions={
          <Button asChild variant="outline" className="h-10 rounded-lg bg-transparent px-4">
            <Link href={routeBase}>
              <ArrowLeft className="h-4 w-4" />
              Back to {subjectType === "user" ? "users" : "groups"}
            </Link>
          </Button>
        }
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load OpenVPN detail</AlertTitle>
          <AlertDescription>{error ?? "The requested subject could not be loaded."}</AlertDescription>
        </Alert>
      </OpenVpnConsoleShell>
    )
  }

  const profile = data.profile
  const totalAccessEntries = Object.values(data.accessLists).reduce((total, list) => total + list.length, 0)
  const authMethod = getStringPropValue(profile.auth_method) ?? "Inherited"
  const isDenied = getBooleanPropValue(profile.deny) ?? false
  const isAutologin = getBooleanPropValue(profile.autologin) ?? false
  const isAdmin = getBooleanPropValue(profile.admin) ?? false
  const isQuickDomainDraft = quickDraft.address.trim() ? !isIpOrCidr(quickDraft.address.trim()) : false
  const isPortDisabled = isQuickDomainDraft || quickDraft.protocol === "all" || quickDraft.protocol === "icmp"

  return (
    <OpenVpnConsoleShell
      title={`${subjectType === "user" ? "User permissions" : "Group permissions"}: ${data.name}`}
      description={`Review the resolved ${subjectType} profile, explicit access lists, and assigned domain routing policy from OpenVPN Access Server.`}
      context={`Access Controls / ${subjectType === "user" ? "Users" : "Groups"}`}
      metrics={[
        {
          label: "Policy state",
          value: isDenied ? "Denied" : "Allowed",
          helper: isDenied ? "An explicit deny is applied" : "No explicit deny on this profile",
          tone: isDenied ? "warning" : "success",
        },
        {
          label: "Admin UI",
          value: isAdmin ? "Enabled" : "Off",
          helper: authMethod,
        },
        {
          label: "Autologin",
          value: isAutologin ? "Enabled" : "Off",
          helper: subjectType === "user" ? "User autologin profile state" : "Group autologin policy state",
        },
        {
          label: "Access entries",
          value: totalAccessEntries,
          helper: `${data.rulesets.length} domain ruleset${data.rulesets.length === 1 ? "" : "s"} attached`,
        },
      ]}
      actions={
        <>
          <Button asChild variant="outline" className="h-10 rounded-lg bg-transparent px-4">
            <Link href={routeBase}>
              <ArrowLeft className="h-4 w-4" />
              Back to {subjectType === "user" ? "users" : "groups"}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-lg bg-transparent px-4"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil className="h-4 w-4" />
            Edit profile
          </Button>
        </>
      }
    >
      {feedback ? (
        <Alert variant={feedback.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{feedback.tone === "error" ? "Action failed" : "Action completed"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      ) : null}

      <OpenVpnPanel
        title={`${subjectType === "user" ? "Define user access rule" : "Define group access rule"}`}
        description={
          subjectType === "user"
            ? "Use the quick rule board for the common NAT and Route rules, then fall back to advanced controls only when needed."
            : "Editing a group rule here affects all users inheriting from this group."
        }
      >
        <div className="space-y-4">
          {quickError ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to save quick rule</AlertTitle>
              <AlertDescription>{quickError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr),minmax(10rem,0.42fr),minmax(9rem,0.34fr),minmax(10rem,0.4fr),auto]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">A single IP address, CIDR block or domain name</label>
              <Input
                value={quickDraft.address}
                disabled={pendingAction !== null}
                onChange={(event) => setQuickDraft((current) => ({ ...current, address: event.target.value }))}
                placeholder="Address (IP, CIDR or Domain)"
                className="h-11 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Protocol</label>
              <Select
                value={quickDraft.protocol}
                onValueChange={(value: QuickRuleProtocol) => setQuickDraft((current) => ({ ...current, protocol: value }))}
                disabled={pendingAction !== null || isQuickDomainDraft}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="udp">UDP</SelectItem>
                  <SelectItem value="icmp">ICMP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Port</label>
              <Input
                value={isPortDisabled ? "" : quickDraft.port}
                disabled={pendingAction !== null || isPortDisabled}
                onChange={(event) => setQuickDraft((current) => ({ ...current, port: event.target.value }))}
                placeholder="All"
                className="h-11 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Reachable via</label>
              <Select
                value={quickDraft.reachableVia}
                onValueChange={(value: "nat" | "route") =>
                  setQuickDraft((current) => ({ ...current, reachableVia: value }))
                }
                disabled={pendingAction !== null}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nat">NAT</SelectItem>
                  <SelectItem value="route">Route</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button className="h-11 rounded-lg px-5" disabled={pendingAction !== null} onClick={() => void handleQuickRuleSave()}>
                {editingQuickRule ? "Update rule" : "Save rule"}
              </Button>
              {editingQuickRule ? (
                <Button type="button" variant="outline" className="h-11 rounded-lg px-5" onClick={resetQuickEditor}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border/80">
            <Table className="[&_td]:py-4">
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 px-4">
                    <input type="checkbox" className="h-4 w-4 rounded-sm border border-border" aria-label="Select all rules" />
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Destination
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Inherited from
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Protocol
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Port
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Reachable via
                  </TableHead>
                  <TableHead className="w-28 pr-4 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quickAccessItems.length ? (
                  quickAccessItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="px-4">
                        <input type="checkbox" className="h-4 w-4 rounded-sm border border-border" aria-label={`Select ${item.destination}`} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{item.destination}</TableCell>
                      <TableCell>{item.sourceLabel}</TableCell>
                      <TableCell>{item.protocolLabel}</TableCell>
                      <TableCell>{item.portLabel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-sm">
                          {item.reachableVia.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-lg bg-transparent"
                            disabled={pendingAction !== null || !item.editable}
                            title={item.editReason ?? "Edit rule"}
                            onClick={() => startQuickEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-lg bg-transparent"
                            disabled={pendingAction !== null}
                            onClick={() => void handleQuickRuleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No quick access rules have been defined yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </OpenVpnPanel>

      <OpenVpnPanel
        title="Advanced OpenVPN controls"
        description="Use the full OpenVPN Access Server structures when you need inbound lists, multiple service filters, or explicit ruleset management."
      >
        <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto flex-wrap rounded-lg border border-border bg-card p-1">
          <TabsTrigger value="overview" className="rounded-md px-3 py-2">
            Properties
          </TabsTrigger>
          <TabsTrigger value="access" className="rounded-md px-3 py-2">
            IP access lists
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-md px-3 py-2">
            Domain rulesets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
            <OpenVpnPanel
              title="Effective properties"
              description="Resolved userprop values returned by Access Server for this subject."
            >
              <dl>
                <ProfileField label="Authentication" value={authMethod} />
                <ProfileField
                  label="VPN access"
                  value={
                    <Badge variant={isDenied ? "destructive" : "outline"} className="rounded-sm">
                      {isDenied ? "Denied" : "Allowed"}
                    </Badge>
                  }
                />
                <ProfileField label="Admin UI" value={isAdmin ? "Enabled" : "Disabled"} />
                <ProfileField label="Autologin" value={isAutologin ? "Enabled" : "Disabled"} />
                <ProfileField
                  label="Web access"
                  value={getBooleanPropValue(profile.deny_web) ? "Client web access denied" : "Client web access allowed"}
                />
                <ProfileField label="TOTP" value={getBooleanPropValue(profile.totp) ? "Required" : "Optional / inherited"} />
                <ProfileField
                  label="Password change"
                  value={getBooleanPropValue(profile.allow_password_change) ? "Self-service allowed" : "Disabled"}
                />
                <ProfileField
                  label="Profile generation"
                  value={getBooleanPropValue(profile.allow_generate_profiles) ? "Allowed" : "Disabled"}
                />
                {subjectType === "user" ? (
                  <>
                    <ProfileField label="Primary group" value={(profile as OpenVpnUserProfile).group ?? "Unassigned"} />
                    <ProfileField label="Static IPv4" value={(profile as OpenVpnUserProfile).static_ipv4 ?? "None"} />
                    <ProfileField label="Static IPv6" value={(profile as OpenVpnUserProfile).static_ipv6 ?? "None"} />
                    <ProfileField
                      label="Password / MFA"
                      value={
                        <>
                          {(profile as OpenVpnUserProfile).password_defined ? "Password set" : "No password defined"}
                          {(profile as OpenVpnUserProfile).mfa_status
                            ? ` / MFA ${(profile as OpenVpnUserProfile).mfa_status}`
                            : ""}
                        </>
                      }
                    />
                  </>
                ) : (
                  <>
                    <ProfileField label="Members" value={(profile as OpenVpnGroupProfile).member_count ?? 0} />
                    <ProfileField label="Assigned subnets" value={(profile as OpenVpnGroupProfile).subnets?.length ?? 0} />
                    <ProfileField
                      label="Dynamic ranges"
                      value={(profile as OpenVpnGroupProfile).dynamic_ranges?.length ?? 0}
                    />
                  </>
                )}
                {getStringPropValue(profile.cc_commands) ? (
                  <ProfileField
                    label="Client config commands"
                    value={
                      <pre className="overflow-x-auto rounded-md bg-muted/40 p-3 text-xs text-foreground">
                        {getStringPropValue(profile.cc_commands)}
                      </pre>
                    }
                  />
                ) : null}
              </dl>
            </OpenVpnPanel>

            <OpenVpnPanel
              title={subjectType === "user" ? "Routing posture" : "Membership snapshot"}
              description={
                subjectType === "user"
                  ? "Quick operational summary of the user-level network posture."
                  : "Current group members returned by Access Server."
              }
            >
              {subjectType === "user" ? (
                <dl>
                  <ProfileField label="Bypass subnets" value={profile.bypass_subnets?.length ?? 0} />
                  <ProfileField
                    label="Client-to-server subnets"
                    value={(profile as OpenVpnUserProfile).client_to_server_subnets?.length ?? 0}
                  />
                  <ProfileField
                    label="DMZ exposure"
                    value={`${(profile as OpenVpnUserProfile).dmz_ip?.length ?? 0} IPv4 / ${(profile as OpenVpnUserProfile).dmz_ipv6?.length ?? 0} IPv6`}
                  />
                </dl>
              ) : (
                <ScrollArea className="max-h-80 pr-4">
                  {(profile as OpenVpnGroupProfile).members?.length ? (
                    <div className="space-y-2">
                      {(profile as OpenVpnGroupProfile).members?.map((member) => (
                        <div
                          key={member}
                          className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-foreground"
                        >
                          {member}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-border bg-muted/10 px-4 py-10 text-sm text-muted-foreground">
                      No members were returned for this group.
                    </div>
                  )}
                </ScrollArea>
              )}
            </OpenVpnPanel>
          </div>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <OpenVpnPanel
            title="Group and user access rules"
            description="Edit the explicit IPv4 and IPv6 access lists attached to this subject."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              {(
                [
                  "access_to_ipv4",
                  "access_from_ipv4",
                  "access_to_ipv6",
                  "access_from_ipv6",
                ] as const
              ).map((listType) => (
                <section key={listType} className="overflow-hidden rounded-xl border border-border/80">
                  <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">{formatAccessListLabel(listType)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {data.accessLists[listType].length} explicit route entr{data.accessLists[listType].length === 1 ? "y" : "ies"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg bg-transparent"
                      onClick={() => setEditingAccessList(listType)}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit list
                    </Button>
                  </div>

                  {data.accessLists[listType].length ? (
                    <Table className="[&_td]:py-2.5">
                      <TableHeader className="bg-slate-50/80 dark:bg-slate-900/30">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Type
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Decision
                          </TableHead>
                          <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Target
                          </TableHead>
                          <TableHead className="pr-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            Service
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.accessLists[listType].map((route, index) => (
                          <TableRow key={`${listType}-${index}`}>
                            <TableCell className="px-4 capitalize">{route.type.replaceAll("_", " ")}</TableCell>
                            <TableCell>
                              <Badge variant={route.accept === false ? "destructive" : "outline"} className="rounded-sm">
                                {route.accept === false ? "Deny" : "Allow"}
                              </Badge>
                            </TableCell>
                            <TableCell>{describeAccessRoute(route)}</TableCell>
                            <TableCell className="pr-4">{describeAccessRouteServices(route)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="px-4 py-10 text-sm text-muted-foreground">
                      No explicit entries. This list currently inherits broader OpenVPN policy.
                    </div>
                  )}
                </section>
              ))}
            </div>
          </OpenVpnPanel>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <OpenVpnPanel
            title="Assigned domain rulesets"
            description="Manage domain routing, filtering, NAT, and bypass behavior attached to this subject."
            actions={
              <Button className="rounded-lg" onClick={() => setIsCreateRulesetOpen(true)}>
                <Plus className="h-4 w-4" />
                Add ruleset
              </Button>
            }
          >
            {data.rulesets.length ? (
              <div className="space-y-4">
                {data.rulesets.map((ruleset) => (
                  <section key={ruleset.id} className="overflow-hidden rounded-xl border border-border/80">
                    <div className="flex flex-col gap-3 border-b border-border bg-muted/10 px-4 py-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{ruleset.name}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Position {ruleset.position ?? 0}
                          {ruleset.comment ? ` / ${ruleset.comment}` : ""}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg bg-transparent"
                          onClick={() => setEditingRulesetId(ruleset.id)}
                        >
                          <Pencil className="h-4 w-4" />
                          Edit ruleset
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg bg-transparent"
                          onClick={() => setEditingRulesId(ruleset.id)}
                        >
                          <Globe2 className="h-4 w-4" />
                          Edit rules
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-lg bg-transparent"
                          onClick={() => void handleUnassignRuleset(ruleset.id)}
                        >
                          Unassign
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="rounded-lg"
                          onClick={() => void handleDeleteRuleset(ruleset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>

                    {ruleset.rules.length ? (
                      <Table className="[&_td]:py-2.5">
                        <TableHeader className="bg-slate-50/80 dark:bg-slate-900/30">
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Type
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Match
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Action
                            </TableHead>
                            <TableHead className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Position
                            </TableHead>
                            <TableHead className="pr-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Comment
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ruleset.rules.map((rule) => (
                            <TableRow key={rule.id ?? `${rule.ruleset_id}-${rule.position}-${rule.match_data}`}>
                              <TableCell className="px-4 capitalize">{rule.type.replaceAll("_", " ")}</TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="font-medium text-foreground">{rule.match_data}</div>
                                  <div className="text-xs text-muted-foreground">{rule.match_type.replaceAll("_", " ")}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-sm">
                                  {rule.action}
                                </Badge>
                              </TableCell>
                              <TableCell>{rule.position}</TableCell>
                              <TableCell className="pr-4">{rule.comment || "-"}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="px-4 py-10 text-sm text-muted-foreground">
                        This ruleset is assigned but does not yet contain any domain rules.
                      </div>
                    )}
                  </section>
                ))}
              </div>
            ) : (
              <div className="px-4 py-16 text-center">
                <p className="text-base font-medium text-foreground">No domain rulesets assigned</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create the first ruleset to manage domain routing, filtering, NAT, or bypass actions.
                </p>
              </div>
            )}
          </OpenVpnPanel>
        </TabsContent>
        </Tabs>
      </OpenVpnPanel>

      {subjectType === "user" ? (
        <OpenVpnUserEditorDialog
          mode="edit"
          open={isEditOpen}
          pending={pendingAction !== null}
          value={toEditableUserState(profile as OpenVpnUserProfile)}
          onOpenChange={setIsEditOpen}
          onSubmit={handleSaveUserProfile}
        />
      ) : (
        <OpenVpnGroupEditorDialog
          mode="edit"
          open={isEditOpen}
          pending={pendingAction !== null}
          value={toEditableGroupState(profile as OpenVpnGroupProfile)}
          onOpenChange={setIsEditOpen}
          onSubmit={handleSaveGroupProfile}
        />
      )}

      {editingAccessList ? (
        <OpenVpnAccessRoutesDialog
          open={editingAccessList !== null}
          pending={pendingAction !== null}
          title={`Edit ${formatAccessListLabel(editingAccessList)}`}
          description={`Manage the explicit ${formatAccessListLabel(editingAccessList).toLowerCase()} entries for ${data.name}.`}
          initialRoutes={data.accessLists[editingAccessList]}
          onOpenChange={(open) => {
            if (!open) {
              setEditingAccessList(null)
            }
          }}
          onSubmit={(routes) => handleSaveAccessList(editingAccessList, routes)}
        />
      ) : null}

      <OpenVpnRulesetDialog
        mode="create"
        open={isCreateRulesetOpen}
        pending={pendingAction !== null}
        includePosition
        onOpenChange={setIsCreateRulesetOpen}
        onSubmit={handleCreateRuleset}
      />

      {selectedRuleset ? (
        <OpenVpnRulesetDialog
          mode="edit"
          open={editingRulesetId !== null}
          pending={pendingAction !== null}
          value={{
            name: selectedRuleset.name,
            comment: selectedRuleset.comment ?? "",
          }}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRulesetId(null)
            }
          }}
          onSubmit={(payload) => handleUpdateRuleset(selectedRuleset.id, payload)}
        />
      ) : null}

      {selectedRulesetForRules ? (
        <OpenVpnRulesDialog
          open={editingRulesId !== null}
          pending={pendingAction !== null}
          rulesetName={selectedRulesetForRules.name}
          rulesetId={selectedRulesetForRules.id}
          initialRules={selectedRulesetForRules.rules}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRulesId(null)
            }
          }}
          onSubmit={(rules) => handleSaveRules(selectedRulesetForRules.id, rules)}
        />
      ) : null}
    </OpenVpnConsoleShell>
  )
}
