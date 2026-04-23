"use client"

import { useEffect, useState } from "react"
import { BellRing, ListChecks, LoaderCircle, MoonStar, RefreshCcw } from "lucide-react"
import { OptionListsContent } from "@/components/settings/option-lists-content"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface NotificationSetting {
  id: string
  label: string
  description: string
  enabled: boolean
  updatedAt?: string
}

interface AppearanceSettings {
  theme: "light" | "dark"
  updatedAt?: string
}

const themeOptions = [
  {
    value: "dark" as const,
    title: "Dark workspace",
    description: "Best for control room operations, low-light monitoring, and extended incident handling.",
  },
  {
    value: "light" as const,
    title: "Light workspace",
    description: "Higher contrast for brightly lit offices and documentation-heavy workflows.",
  },
]

const appearancePreviewClasses = {
  dark: ["bg-slate-950", "bg-cyan-400/70", "bg-slate-700"],
  light: ["bg-white", "bg-sky-500/70", "bg-slate-200"],
}

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

export function SettingsContent() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("notifications")
  const [notifications, setNotifications] = useState<NotificationSetting[]>([])
  const [appearance, setAppearance] = useState<AppearanceSettings>({ theme: "dark" })
  const [isLoading, setIsLoading] = useState(true)
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)
  const [appearanceMessage, setAppearanceMessage] = useState<string | null>(null)
  const [isUpdatingNotificationId, setIsUpdatingNotificationId] = useState<string | null>(null)
  const [isSavingAppearance, setIsSavingAppearance] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadSettings() {
      try {
        setIsLoading(true)
        const [notificationsResponse, appearanceResponse] = await Promise.all([
          fetch("/api/settings/notifications", { cache: "no-store" }),
          fetch("/api/settings/appearance", { cache: "no-store" }),
        ])

        if (!notificationsResponse.ok || !appearanceResponse.ok) {
          throw new Error("Unable to load workspace settings")
        }

        const notificationsPayload = (await notificationsResponse.json()) as {
          items: NotificationSetting[]
        }
        const appearancePayload = (await appearanceResponse.json()) as AppearanceSettings

        if (!isActive) {
          return
        }

        setNotifications(notificationsPayload.items)
        setAppearance(appearancePayload)
        setTheme(appearancePayload.theme)
        setNotificationMessage(null)
        setAppearanceMessage(null)
      } catch (error) {
        if (!isActive) {
          return
        }

        const message = error instanceof Error ? error.message : "Unable to load workspace settings"
        setNotificationMessage(message)
        setAppearanceMessage(message)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      isActive = false
    }
  }, [setTheme])

  const currentTheme = mounted ? (resolvedTheme ?? theme ?? appearance.theme) : appearance.theme

  async function updateNotification(notificationId: string, enabled: boolean) {
    setIsUpdatingNotificationId(notificationId)
    setNotificationMessage(null)

    const previous = notifications.map((item) => ({ ...item }))
    setNotifications((current) =>
      current.map((item) => (item.id === notificationId ? { ...item, enabled } : item)),
    )

    try {
      const response = await fetch(`/api/settings/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled }),
      })

      if (!response.ok) {
        throw new Error("Unable to update notification setting")
      }

      const updated = (await response.json()) as NotificationSetting

      setNotifications((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setNotificationMessage(`Updated "${updated.label}" at ${formatTimestamp(updated.updatedAt)}`)
    } catch (error) {
      setNotifications(previous)
      setNotificationMessage(error instanceof Error ? error.message : "Unable to update notification setting")
    } finally {
      setIsUpdatingNotificationId(null)
    }
  }

  async function updateAppearance(nextTheme: "light" | "dark") {
    setIsSavingAppearance(true)
    setAppearanceMessage(null)
    const previousTheme = appearance.theme
    setTheme(nextTheme)
    setAppearance((current) => ({ ...current, theme: nextTheme }))

    try {
      const response = await fetch("/api/settings/appearance", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ theme: nextTheme }),
      })

      if (!response.ok) {
        throw new Error("Unable to update appearance settings")
      }

      const saved = (await response.json()) as AppearanceSettings
      setAppearance(saved)
      setTheme(saved.theme)
      setAppearanceMessage(`Theme saved as ${saved.theme} at ${formatTimestamp(saved.updatedAt)}`)
    } catch (error) {
      setTheme(previousTheme)
      setAppearance((current) => ({ ...current, theme: previousTheme }))
      setAppearanceMessage(error instanceof Error ? error.message : "Unable to update appearance settings")
    } finally {
      setIsSavingAppearance(false)
    }
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-5">
      <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-2xl border border-border/80 bg-card p-2 md:grid-cols-3">
        <TabsTrigger value="notifications" className="h-10 rounded-lg">
          <BellRing className="h-4 w-4" />
          Notification preferences
        </TabsTrigger>
        <TabsTrigger value="appearance" className="h-10 rounded-lg">
          <MoonStar className="h-4 w-4" />
          Appearance
        </TabsTrigger>
        <TabsTrigger value="option-lists" className="h-10 rounded-lg">
          <ListChecks className="h-4 w-4" />
          Field lists
        </TabsTrigger>
      </TabsList>

      <TabsContent value="notifications" className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification preferences</CardTitle>
            <CardDescription>
              Choose which operational events should trigger alerts for the workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              {notifications.map((item) => {
                const isUpdating = isUpdatingNotificationId === item.id

                return (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/80 bg-muted/15 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2 pr-4">
                        <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BellRing className="h-4 w-4" />
                          </div>
                          <p className="font-medium text-foreground">{item.label}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isUpdating && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}
                        <Switch
                          checked={item.enabled}
                          disabled={isLoading || isUpdating}
                          onCheckedChange={(checked) => void updateNotification(item.id, checked)}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 font-medium",
                        item.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.enabled ? "Enabled" : "Disabled"}
                      </span>
                      <span>Updated: {formatTimestamp(item.updatedAt)}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
              <p className="text-sm font-medium text-foreground">Notification status</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {notificationMessage ?? "Changes are saved as soon as a toggle is updated."}
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="appearance" className="w-full">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Appearance</CardTitle>
            <CardDescription>
              Choose the workspace theme used throughout the control plane.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              {themeOptions.map((option) => {
                const isSelected = currentTheme === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "rounded-xl border p-5 text-left transition-colors",
                      isSelected ? "border-primary/40 bg-muted/15" : "border-border/80 bg-muted/10 hover:border-primary/25",
                    )}
                    disabled={isLoading || isSavingAppearance || !mounted}
                    aria-pressed={isSelected}
                    onClick={() => void updateAppearance(option.value)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <MoonStar className="h-4 w-4" />
                          </div>
                          <p className="font-medium text-foreground">{option.title}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>

                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {isSelected ? "Active" : "Set theme"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3">
                      {appearancePreviewClasses[option.value].map((previewClass, index) => (
                        <div
                          key={`${option.value}-${index}`}
                          className={cn("h-20 rounded-2xl border border-border/60", previewClass)}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MoonStar className="h-4 w-4" />
                </div>
                <p className="font-medium text-foreground">Current theme</p>
                <p className="mt-1 text-sm text-foreground">{currentTheme}</p>
                <p className="mt-2 text-sm text-muted-foreground">Saved theme: {appearance.theme}</p>
                <p className="mt-2 text-xs text-muted-foreground">Updated: {formatTimestamp(appearance.updatedAt)}</p>
              </div>

              <div className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MoonStar className="h-4 w-4" />
                </div>
                <p className="font-medium text-foreground">Appearance status</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {appearanceMessage ?? "Theme changes apply immediately and are then saved."}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              className="rounded-xl bg-transparent"
              onClick={() => void updateAppearance(currentTheme === "dark" ? "dark" : "light")}
              disabled={isLoading || isSavingAppearance || !mounted}
            >
              <RefreshCcw className="h-4 w-4" />
              Re-save current theme
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="option-lists" className="w-full">
        <OptionListsContent />
      </TabsContent>
    </Tabs>
  )
}
