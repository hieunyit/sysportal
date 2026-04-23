"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  AlertCircle,
  KeyRound,
  LoaderCircle,
  Mail,
  MailPlus,
  Save,
  ShieldCheck,
  Wifi,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

type ConnectorKey = "keycloak" | "openvpn" | "smtp" | "smtp-welcome"
type EmailConnectorKey = "smtp" | "smtp-welcome"
type SmtpTlsMode = "direct" | "starttls" | "none"

interface KeycloakSettings {
  serverUrl: string
  realm: string
  clientId: string
  clientSecret: string
  ldapProviderId: string
  verifyTls: boolean
  timeoutSeconds: number
}

interface OpenVpnSettings {
  serverUrl: string
  apiBasePath: string
  username: string
  password: string
  nodeName: string
  verifyTls: boolean
  timeoutSeconds: number
}

interface SmtpSettings {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  fromName: string
  tlsMode: SmtpTlsMode
  insecureSkipVerify: boolean
  requireAuth: boolean
}

interface SystemSettings {
  keycloak: KeycloakSettings
  openvpn: OpenVpnSettings
  smtp: SmtpSettings
  smtpWelcome: SmtpSettings
  updatedAt?: string
}

interface ConnectionCollectionResponse {
  items: Array<{
    id: ConnectorKey
    config: KeycloakSettings | OpenVpnSettings | SmtpSettings
    updatedAt?: string
  }>
  updatedAt?: string
}

interface ConnectionResourceResponse {
  id: ConnectorKey
  config: KeycloakSettings | OpenVpnSettings | SmtpSettings
  updatedAt?: string
}

interface ConnectionCheckResult {
  ok: boolean
  connector: ConnectorKey
  message: string
  checkedAt: string
  details?: string[]
}

interface ConnectorNotice {
  tone: "success" | "error"
  message: string
}

interface ConnectorMeta {
  title: string
  summary: string
  note: string
  icon: typeof KeyRound
}

const connectorOrder: ConnectorKey[] = ["keycloak", "openvpn", "smtp", "smtp-welcome"]
const CONNECTOR_CHECK_POLL_INTERVAL_MS = 5 * 60 * 1000

const connectorMeta: Record<ConnectorKey, ConnectorMeta> = {
  keycloak: {
    title: "Keycloak",
    summary: "Realm endpoint and confidential client used by the control plane.",
    note: "OIDC client credentials",
    icon: KeyRound,
  },
  openvpn: {
    title: "OpenVPN",
    summary: "Access Server admin endpoint and credentials for token-based operations.",
    note: "Admin token check",
    icon: ShieldCheck,
  },
  smtp: {
    title: "Notification Email",
    summary: "SMTP relay for operational alerts, approvals, and service notifications.",
    note: "Ops notifications",
    icon: Mail,
  },
  "smtp-welcome": {
    title: "Welcome Email",
    summary: "SMTP relay dedicated to onboarding and welcome messages for new joiners.",
    note: "Onboarding delivery",
    icon: MailPlus,
  },
}

const emptySystem: SystemSettings = {
  keycloak: {
    serverUrl: "https://sso.example.com",
    realm: "master",
    clientId: "identityops-admin",
    clientSecret: "",
    ldapProviderId: "",
    verifyTls: true,
    timeoutSeconds: 15,
  },
  openvpn: {
    serverUrl: "https://vpn.example.com",
    apiBasePath: "/api",
    username: "openvpn-api",
    password: "",
    nodeName: "",
    verifyTls: true,
    timeoutSeconds: 15,
  },
  smtp: {
    host: "smtp.example.com",
    port: 587,
    username: "identityops-notify",
    password: "",
    fromAddress: "identityops@example.com",
    fromName: "IdentityOps Notifications",
    tlsMode: "starttls",
    insecureSkipVerify: false,
    requireAuth: true,
  },
  smtpWelcome: {
    host: "smtp.example.com",
    port: 587,
    username: "identityops-welcome",
    password: "",
    fromAddress: "welcome@example.com",
    fromName: "People Operations Welcome",
    tlsMode: "starttls",
    insecureSkipVerify: false,
    requireAuth: true,
  },
}

const smtpTlsModeOptions: Array<{ value: SmtpTlsMode; label: string }> = [
  { value: "direct", label: "Direct TLS" },
  { value: "starttls", label: "STARTTLS" },
  { value: "none", label: "No encryption" },
]

function formatTimestamp(value?: string) {
  if (!value) {
    return "Not saved yet"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function getConnectorTitle(connector: ConnectorKey) {
  return connectorMeta[connector].title
}

function getConnectorCheckLabel(result?: ConnectionCheckResult, isAutoChecking?: boolean) {
  if (isAutoChecking) {
    return "Checking..."
  }

  if (!result) {
    return "Not checked"
  }

  return result.ok ? "Connected" : "Failed"
}

function getConnectorCheckVariant(result?: ConnectionCheckResult, isAutoChecking?: boolean) {
  if (isAutoChecking) {
    return "secondary" as const
  }

  if (!result) {
    return "outline" as const
  }

  return result.ok ? "default" as const : "destructive" as const
}

function getConnectorSurfaceClass(isActive: boolean) {
  return cn(
    "h-auto rounded-xl border p-0 text-left transition-all",
    isActive
      ? "border-primary/40 bg-background"
      : "border-border/80 bg-card hover:border-primary/25",
  )
}

async function readResponseMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as {
      error?: string
      detail?: string
      message?: string
      details?: Array<{ message?: string }>
    }

    const errorDetail = payload.details?.map((item) => item.message).filter(Boolean).join("; ")

    return payload.detail ?? payload.error ?? payload.message ?? errorDetail ?? fallback
  } catch {
    return fallback
  }
}

function mapConnectionCollection(payload: ConnectionCollectionResponse) {
  const nextSystem: SystemSettings = {
    ...emptySystem,
    updatedAt: payload.updatedAt,
  }

  payload.items.forEach((item) => {
    switch (item.id) {
      case "keycloak":
        nextSystem.keycloak = item.config as KeycloakSettings
        break
      case "openvpn":
        nextSystem.openvpn = item.config as OpenVpnSettings
        break
      case "smtp":
        nextSystem.smtp = item.config as SmtpSettings
        break
      case "smtp-welcome":
        nextSystem.smtpWelcome = item.config as SmtpSettings
        break
    }
  })

  return nextSystem
}

function FieldGroup({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="rounded-xl border-border/80 shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  )
}

function ToggleField({
  title,
  description,
  checked,
  disabled,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  disabled: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/15 px-4 py-3">
      <div className="pr-4">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function ConnectorStatePanel({
  updatedAt,
  checkResult,
  saveNotice,
}: {
  updatedAt?: string
  checkResult?: ConnectionCheckResult
  saveNotice?: ConnectorNotice
}) {
  const primaryMessage = checkResult?.message ?? saveNotice?.message ?? "Ready to validate this connector."
  const detailItems = checkResult?.details?.filter(Boolean) ?? []
  const secondaryMessage = saveNotice?.tone === "error" ? "Review the configuration and try again." : undefined

  return (
    <Card className="rounded-xl border-border/80 shadow-none">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Status</p>
            <p className="text-sm text-muted-foreground">Latest save and runtime check result.</p>
          </div>
          <Badge variant={getConnectorCheckVariant(checkResult)}>{getConnectorCheckLabel(checkResult)}</Badge>
        </div>

        <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
          <p className="text-sm font-medium text-foreground">{primaryMessage}</p>
          {detailItems.length > 0 ? (
            <div className="mt-3 space-y-2 rounded-lg border border-border/80 bg-background p-3">
              {detailItems.map((detail, index) => (
                <p key={`${detail}-${index}`} className="text-sm text-muted-foreground">
                  {detail}
                </p>
              ))}
            </div>
          ) : null}
          {!detailItems.length && secondaryMessage ? (
            <p className="mt-2 text-sm text-muted-foreground">{secondaryMessage}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last saved</p>
            <p className="mt-2 text-sm font-medium text-foreground">{formatTimestamp(updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last check</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {checkResult ? formatTimestamp(checkResult.checkedAt) : "Not checked yet"}
            </p>
          </div>
        </div>

        {saveNotice ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              saveNotice.tone === "error"
                ? "border-destructive/40 bg-destructive/6 text-foreground"
                : "border-primary/30 bg-primary/6 text-foreground",
            )}
          >
            {saveNotice.message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ConnectionSettingsContent() {
  const [activeTab, setActiveTab] = useState<ConnectorKey>("keycloak")
  const [system, setSystem] = useState<SystemSettings>(emptySystem)
  const systemRef = useRef<SystemSettings>(emptySystem)
  const [isLoading, setIsLoading] = useState(true)
  const [loadMessage, setLoadMessage] = useState<string | null>(null)
  const [saveStates, setSaveStates] = useState<Record<ConnectorKey, boolean>>({
    keycloak: false,
    openvpn: false,
    smtp: false,
    "smtp-welcome": false,
  })
  const [checkStates, setCheckStates] = useState<Record<ConnectorKey, boolean>>({
    keycloak: false,
    openvpn: false,
    smtp: false,
    "smtp-welcome": false,
  })
  const [autoCheckStates, setAutoCheckStates] = useState<Record<ConnectorKey, boolean>>({
    keycloak: false,
    openvpn: false,
    smtp: false,
    "smtp-welcome": false,
  })
  const [saveNotices, setSaveNotices] = useState<Partial<Record<ConnectorKey, ConnectorNotice>>>({})
  const [checkResults, setCheckResults] = useState<Partial<Record<ConnectorKey, ConnectionCheckResult>>>({})

  async function autoRunCheckWithSettings(connector: ConnectorKey, settings: SystemSettings) {
    setAutoCheckStates((current) => ({ ...current, [connector]: true }))
    try {
      const response = await fetch(`/api/connections/${connector}/checks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getConnectorSettings(connector, settings)),
      })

      if (response.ok) {
        const result = (await response.json()) as ConnectionCheckResult
        setCheckResults((current) => ({
          ...current,
          [connector]: result,
        }))
      }
    } catch (error) {
      // Silently fail on auto-checks, but still update the result with error
      setCheckResults((current) => ({
        ...current,
        [connector]: {
          ok: false,
          connector,
          checkedAt: new Date().toISOString(),
          message: error instanceof Error ? error.message : "Auto-check failed",
        },
      }))
    } finally {
      setAutoCheckStates((current) => ({ ...current, [connector]: false }))
    }
  }

  useEffect(() => {
    systemRef.current = system
  }, [system])

  useEffect(() => {
    let isActive = true

    async function loadConnections() {
      try {
        setIsLoading(true)
        const response = await fetch("/api/connections", { cache: "no-store" })

        if (!response.ok) {
          throw new Error(await readResponseMessage(response, "Unable to load connections"))
        }

        const data = (await response.json()) as ConnectionCollectionResponse

        if (!isActive) {
          return
        }

        const mappedSystem = mapConnectionCollection(data)
        setSystem(mappedSystem)
        setLoadMessage(null)

        // Auto-run checks for all connectors after loading
        connectorOrder.forEach((connector) => {
          void autoRunCheckWithSettings(connector, mappedSystem)
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setLoadMessage(error instanceof Error ? error.message : "Unable to load connections")
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadConnections()

    // Set up auto-refresh of checks every 5 minutes
    const interval = setInterval(() => {
      if (isActive) {
        connectorOrder.forEach((connector) => {
          void autoRunCheckWithSettings(connector, systemRef.current)
        })
      }
    }, CONNECTOR_CHECK_POLL_INTERVAL_MS)

    return () => {
      isActive = false
      clearInterval(interval)
    }
  }, [])

  function updateKeycloakField<Key extends keyof KeycloakSettings>(
    field: Key,
    value: KeycloakSettings[Key],
  ) {
    setSystem((current) => ({
      ...current,
      keycloak: {
        ...current.keycloak,
        [field]: value,
      },
    }))
  }

  function updateOpenVpnField<Key extends keyof OpenVpnSettings>(
    field: Key,
    value: OpenVpnSettings[Key],
  ) {
    setSystem((current) => ({
      ...current,
      openvpn: {
        ...current.openvpn,
        [field]: value,
      },
    }))
  }

  function updateEmailField<Key extends keyof SmtpSettings>(
    connector: EmailConnectorKey,
    field: Key,
    value: SmtpSettings[Key],
  ) {
    setSystem((current) => ({
      ...current,
      [connector === "smtp" ? "smtp" : "smtpWelcome"]: {
        ...(connector === "smtp" ? current.smtp : current.smtpWelcome),
        [field]: value,
      },
    }))
  }

  function getEmailSettings(connector: EmailConnectorKey) {
    return connector === "smtp" ? system.smtp : system.smtpWelcome
  }

  function getConnectorSettings(
    connector: ConnectorKey,
    source: SystemSettings = system,
  ): KeycloakSettings | OpenVpnSettings | SmtpSettings {
    switch (connector) {
      case "keycloak":
        return source.keycloak
      case "openvpn":
        return source.openvpn
      case "smtp":
        return source.smtp
      case "smtp-welcome":
        return source.smtpWelcome
    }
  }

  function applyConnectorConfig(
    connector: ConnectorKey,
    config: KeycloakSettings | OpenVpnSettings | SmtpSettings,
    current: SystemSettings,
  ): SystemSettings {
    switch (connector) {
      case "keycloak":
        return { ...current, keycloak: config as KeycloakSettings }
      case "openvpn":
        return { ...current, openvpn: config as OpenVpnSettings }
      case "smtp":
        return { ...current, smtp: config as SmtpSettings }
      case "smtp-welcome":
        return { ...current, smtpWelcome: config as SmtpSettings }
    }
  }

  async function saveConnector(connector: ConnectorKey) {
    setSaveStates((current) => ({ ...current, [connector]: true }))
    setSaveNotices((current) => {
      const next = { ...current }
      delete next[connector]
      return next
    })

    try {
      const response = await fetch(`/api/connections/${connector}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getConnectorSettings(connector)),
      })

      if (!response.ok) {
        throw new Error(
          await readResponseMessage(response, `Unable to save ${getConnectorTitle(connector)} connection`),
        )
      }

      const payload = (await response.json()) as ConnectionResourceResponse

      setSystem((current) => ({
        ...applyConnectorConfig(connector, payload.config, current),
        updatedAt: payload.updatedAt ?? current.updatedAt,
      }))
      setSaveNotices((current) => ({
        ...current,
        [connector]: {
          tone: "success",
          message: `${getConnectorTitle(connector)} saved successfully.`,
        },
      }))
    } catch (error) {
      setSaveNotices((current) => ({
        ...current,
        [connector]: {
          tone: "error",
          message:
            error instanceof Error
              ? error.message
              : `Unable to save ${getConnectorTitle(connector)} connection`,
        },
      }))
    } finally {
      setSaveStates((current) => ({ ...current, [connector]: false }))
    }
  }

  async function runCheck(connector: ConnectorKey) {
    setCheckStates((current) => ({ ...current, [connector]: true }))
    setCheckResults((current) => {
      const next = { ...current }
      delete next[connector]
      return next
    })

    try {
      const response = await fetch(`/api/connections/${connector}/checks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getConnectorSettings(connector)),
      })

      if (!response.ok) {
        throw new Error(
          await readResponseMessage(response, `Unable to run ${getConnectorTitle(connector)} check`),
        )
      }

      const result = (await response.json()) as ConnectionCheckResult

      setCheckResults((current) => ({
        ...current,
        [connector]: result,
      }))
    } catch (error) {
      setCheckResults((current) => ({
        ...current,
        [connector]: {
          ok: false,
          connector,
          checkedAt: new Date().toISOString(),
          message:
            error instanceof Error
              ? error.message
              : `Unable to run ${getConnectorTitle(connector)} check`,
        },
      }))
    } finally {
      setCheckStates((current) => ({ ...current, [connector]: false }))
    }
  }

  function renderShell(connector: ConnectorKey, fields: ReactNode) {
    const meta = connectorMeta[connector]
    const Icon = meta.icon
    const isSaving = saveStates[connector]
    const isChecking = checkStates[connector]
    const isAutoChecking = autoCheckStates[connector]
    const checkResult = checkResults[connector]
    const saveNotice = saveNotices[connector]

    return (
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="border-b border-border/80 px-6 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold text-foreground">{meta.title}</h3>
                  <p className="max-w-2xl text-sm text-muted-foreground">{meta.summary}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={getConnectorCheckVariant(checkResult, isAutoChecking)}>
                    {getConnectorCheckLabel(checkResult, isAutoChecking)}
                  </Badge>
                  <span className="rounded-lg border border-border/80 bg-muted/15 px-3 py-1 text-xs text-muted-foreground">
                    {meta.note}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => void runCheck(connector)}
                disabled={isLoading || isSaving || isChecking}
                className="rounded-xl px-4"
              >
                {isChecking ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Wifi className="h-4 w-4" />
                )}
                {isChecking ? "Checking..." : "Run check"}
              </Button>
              <Button
                onClick={() => void saveConnector(connector)}
                disabled={isLoading || isSaving || isChecking}
                className="rounded-xl px-4"
              >
                {isSaving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
          <div className="space-y-4">{fields}</div>
          <div className="space-y-4 xl:pt-1">
            <ConnectorStatePanel updatedAt={system.updatedAt} checkResult={checkResult} saveNotice={saveNotice} />
          </div>
        </div>
      </section>
    )
  }

  function renderEmailFields(
    connector: EmailConnectorKey,
    {
      serverDescription,
      identityDescription,
    }: {
      serverDescription: string
      identityDescription: string
    },
  ) {
    const emailSettings = getEmailSettings(connector)

    return (
      <>
        <FieldGroup title="Mail server" description={serverDescription}>
          <div className="space-y-2">
            <Label htmlFor={`${connector}-host`}>Host</Label>
            <Input
              id={`${connector}-host`}
              value={emailSettings.host}
              disabled={isLoading}
              onChange={(event) => updateEmailField(connector, "host", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${connector}-port`}>Port</Label>
            <Input
              id={`${connector}-port`}
              type="number"
              min={1}
              value={emailSettings.port}
              disabled={isLoading}
              onChange={(event) => updateEmailField(connector, "port", Number(event.target.value) || 0)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`${connector}-tls-mode`}>TLS mode</Label>
            <Select
              value={emailSettings.tlsMode}
              onValueChange={(value) => updateEmailField(connector, "tlsMode", value as SmtpTlsMode)}
              disabled={isLoading}
            >
              <SelectTrigger id={`${connector}-tls-mode`} className="w-full border-border bg-background/85">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {smtpTlsModeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <ToggleField
              title="Skip certificate verification"
              description="Keep disabled unless the mail server uses an internal or self-signed certificate."
              checked={emailSettings.insecureSkipVerify}
              disabled={isLoading || emailSettings.tlsMode === "none"}
              onCheckedChange={(checked) => updateEmailField(connector, "insecureSkipVerify", checked)}
            />
          </div>
        </FieldGroup>

        <FieldGroup title="Delivery identity" description={identityDescription}>
          <div className="space-y-2">
            <Label htmlFor={`${connector}-from-address`}>From address</Label>
            <Input
              id={`${connector}-from-address`}
              type="email"
              value={emailSettings.fromAddress}
              disabled={isLoading}
              onChange={(event) => updateEmailField(connector, "fromAddress", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${connector}-from-name`}>From name</Label>
            <Input
              id={`${connector}-from-name`}
              value={emailSettings.fromName}
              disabled={isLoading}
              onChange={(event) => updateEmailField(connector, "fromName", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${connector}-username`}>Username</Label>
            <Input
              id={`${connector}-username`}
              value={emailSettings.username}
              disabled={isLoading}
              onChange={(event) => updateEmailField(connector, "username", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${connector}-password`}>Password</Label>
            <Input
              id={`${connector}-password`}
              type="password"
              value={emailSettings.password}
              disabled={isLoading}
              onChange={(event) => updateEmailField(connector, "password", event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <ToggleField
              title="Require authentication"
              description="Disable only for trusted internal relays."
              checked={emailSettings.requireAuth}
              disabled={isLoading}
              onCheckedChange={(checked) => updateEmailField(connector, "requireAuth", checked)}
            />
          </div>
        </FieldGroup>
      </>
    )
  }

  return (
    <div className="space-y-6">
      {loadMessage ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load connections</AlertTitle>
          <AlertDescription>{loadMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ConnectorKey)} className="w-full gap-5">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl border border-border/80 bg-card p-2 xl:grid-cols-4">
          {connectorOrder.map((connector) => {
            const meta = connectorMeta[connector]
            const Icon = meta.icon
            const isActive = activeTab === connector

            return (
              <TabsTrigger key={connector} value={connector} className={getConnectorSurfaceClass(isActive)}>
                <div className="flex w-full items-center gap-3 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{meta.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{meta.note}</p>
                    </div>
                    <Badge variant={getConnectorCheckVariant(checkResults[connector])}>
                      {getConnectorCheckLabel(checkResults[connector])}
                    </Badge>
                  </div>
                </div>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value="keycloak" className="w-full">
          {renderShell(
            "keycloak",
            <>
              <FieldGroup
                title="Realm access"
                description="Identity provider base URL and realm used for automation."
              >
                <div className="space-y-2">
                  <Label htmlFor="keycloak-server-url">Server URL</Label>
                  <Input
                    id="keycloak-server-url"
                    value={system.keycloak.serverUrl}
                    disabled={isLoading}
                    onChange={(event) => updateKeycloakField("serverUrl", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keycloak-realm">Realm</Label>
                  <Input
                    id="keycloak-realm"
                    value={system.keycloak.realm}
                    disabled={isLoading}
                    onChange={(event) => updateKeycloakField("realm", event.target.value)}
                  />
                </div>
              </FieldGroup>

              <FieldGroup
                title="Client credentials"
                description="Confidential client values used for token-based access and LDAP sync control."
              >
                <div className="space-y-2">
                  <Label htmlFor="keycloak-client-id">Client ID</Label>
                  <Input
                    id="keycloak-client-id"
                    value={system.keycloak.clientId}
                    disabled={isLoading}
                    onChange={(event) => updateKeycloakField("clientId", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keycloak-client-secret">Client secret</Label>
                  <Input
                    id="keycloak-client-secret"
                    type="password"
                    value={system.keycloak.clientSecret}
                    disabled={isLoading}
                    onChange={(event) => updateKeycloakField("clientSecret", event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="keycloak-ldap-provider-id">LDAP provider ID</Label>
                  <Input
                    id="keycloak-ldap-provider-id"
                    value={system.keycloak.ldapProviderId}
                    disabled={isLoading}
                    onChange={(event) => updateKeycloakField("ldapProviderId", event.target.value)}
                    placeholder="JFeVe2bRQPi6jDQp5IIaSA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keycloak-timeout">Timeout seconds</Label>
                  <Input
                    id="keycloak-timeout"
                    type="number"
                    min={1}
                    value={system.keycloak.timeoutSeconds}
                    disabled={isLoading}
                    onChange={(event) => updateKeycloakField("timeoutSeconds", Number(event.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end">
                  <ToggleField
                    title="Verify TLS"
                    description="Keep enabled for production endpoints."
                    checked={system.keycloak.verifyTls}
                    disabled={isLoading}
                    onCheckedChange={(checked) => updateKeycloakField("verifyTls", checked)}
                  />
                </div>
              </FieldGroup>
            </>,
          )}
        </TabsContent>

        <TabsContent value="openvpn" className="w-full">
          {renderShell(
            "openvpn",
            <>
              <FieldGroup
                title="Access Server endpoint"
                description="Server address, API path, and optional backend node routing."
              >
                <div className="space-y-2">
                  <Label htmlFor="openvpn-server-url">Server URL</Label>
                  <Input
                    id="openvpn-server-url"
                    value={system.openvpn.serverUrl}
                    disabled={isLoading}
                    onChange={(event) => updateOpenVpnField("serverUrl", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openvpn-api-base-path">API path</Label>
                  <Input
                    id="openvpn-api-base-path"
                    value={system.openvpn.apiBasePath}
                    disabled={isLoading}
                    onChange={(event) => updateOpenVpnField("apiBasePath", event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="openvpn-node-name">Node name</Label>
                  <Input
                    id="openvpn-node-name"
                    placeholder="Optional"
                    value={system.openvpn.nodeName}
                    disabled={isLoading}
                    onChange={(event) => updateOpenVpnField("nodeName", event.target.value)}
                  />
                </div>
              </FieldGroup>

              <FieldGroup
                title="Admin credentials"
                description="Admin account used to obtain the OpenVPN auth token."
              >
                <div className="space-y-2">
                  <Label htmlFor="openvpn-username">Admin username</Label>
                  <Input
                    id="openvpn-username"
                    value={system.openvpn.username}
                    disabled={isLoading}
                    onChange={(event) => updateOpenVpnField("username", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openvpn-password">Admin password</Label>
                  <Input
                    id="openvpn-password"
                    type="password"
                    value={system.openvpn.password}
                    disabled={isLoading}
                    onChange={(event) => updateOpenVpnField("password", event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="openvpn-timeout">Timeout seconds</Label>
                  <Input
                    id="openvpn-timeout"
                    type="number"
                    min={1}
                    value={system.openvpn.timeoutSeconds}
                    disabled={isLoading}
                    onChange={(event) => updateOpenVpnField("timeoutSeconds", Number(event.target.value) || 0)}
                  />
                </div>
                <div className="flex items-end">
                  <ToggleField
                    title="Verify TLS"
                    description="Disable only for isolated lab environments."
                    checked={system.openvpn.verifyTls}
                    disabled={isLoading}
                    onCheckedChange={(checked) => updateOpenVpnField("verifyTls", checked)}
                  />
                </div>
              </FieldGroup>
            </>,
          )}
        </TabsContent>

        <TabsContent value="smtp" className="w-full">
          {renderShell(
            "smtp",
            renderEmailFields("smtp", {
              serverDescription: "Host, port, and transport mode for alerts, approvals, and ops notifications.",
              identityDescription: "Sender details used for the operational notification mailbox.",
            }),
          )}
        </TabsContent>

        <TabsContent value="smtp-welcome" className="w-full">
          {renderShell(
            "smtp-welcome",
            renderEmailFields("smtp-welcome", {
              serverDescription: "Host, port, and transport mode for onboarding and welcome message delivery.",
              identityDescription: "Sender details used for new joiner welcome emails.",
            }),
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
