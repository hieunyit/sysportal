"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  CalendarRange,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  KeyRound,
  FileCode2,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Network,
  Settings,
  ServerCog,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const workspaceItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/" },
  { icon: ShieldCheck, label: "Access Requests", badge: "36", href: "/tasks" },
  { icon: CalendarRange, label: "Change Windows", href: "/calendar" },
  { icon: BarChart3, label: "Audit Log", href: "/analytics" },
  { icon: Users, label: "Operations Team", href: "/team" },
]

const keycloakItems = [
  { icon: KeyRound, label: "Users", href: "/users" },
  { icon: Users, label: "Groups", href: "/groups" },
  { icon: Activity, label: "Sessions", href: "/sessions" },
]

const openVpnItems = [
  { icon: UserRound, label: "Users", href: "/openvpn/users" },
  { icon: Users, label: "Groups", href: "/openvpn/groups" },
]

const generalItems = [
  { icon: ServerCog, label: "Connections", href: "/connections" },
  { icon: FileCode2, label: "Email Templates", href: "/content-generator" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Support", href: "/help" },
  { icon: LogOut, label: "Logout", href: "/logout" },
]

const platformStatus = [
  { name: "Keycloak", status: "Healthy" },
  { name: "OpenVPN", status: "Monitoring" },
  { name: "Jira", status: "Healthy" },
]

interface SidebarProps {
  isCollapsed?: boolean
  mobile?: boolean
  onToggle?: () => void
}

export function Sidebar({ isCollapsed = false, mobile = false, onToggle }: SidebarProps = {}) {
  const pathname = usePathname()
  const isKeycloakRoute = keycloakItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
  const isOpenVpnRoute = openVpnItems.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))

  return (
    <aside
      className={cn(
        "flex flex-col overflow-y-auto border-r border-primary/20 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 backdrop-blur-md dark:from-sidebar dark:via-sidebar dark:to-sidebar/80",
        mobile
          ? "h-full w-full"
          : "fixed left-0 top-0 z-30 h-screen transition-all duration-300 ease-in-out",
        !mobile && (isCollapsed ? "w-[5rem]" : "w-72"),
      )}
    >
      <div className={cn("flex h-full flex-col p-4", isCollapsed && "px-2.5")}>
        <div className={cn("mb-7 flex items-start gap-3 transition-all", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <Link href="/" className="group w-full">
              <div className="space-y-1.5">
                <div className="flex items-center gap-3 transition-all group-hover:scale-105">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary ring-1.5 ring-primary/30 group-hover:ring-primary/50 transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight text-sidebar-foreground">Pulse</p>
                    <p className="text-[10px] text-primary/60 dark:text-primary/70 font-medium">Engineering Metrics</p>
                  </div>
                </div>
              </div>
            </Link>
          )}
          
          {isCollapsed && (
            <Link href="/" className="group">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary ring-1.5 ring-primary/30 group-hover:ring-primary/50 transition-all group-hover:shadow-lg group-hover:shadow-primary/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </Link>
          )}

          {onToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "mt-1 h-8 w-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 hover:border-primary/50 transition-all",
                isCollapsed && "mx-auto",
              )}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="space-y-6">
          <div>
            {!isCollapsed && (
              <p className="mb-3 px-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-primary/60 dark:text-primary/70">
                Workspace
              </p>
            )}
            <nav className="space-y-1.5">
              {isCollapsed ? (
                <>
                  <Link
                    href="/users"
                    title="Keycloak"
                    className={cn(
                      "flex items-center justify-center rounded-lg border px-2.5 py-3 text-sm transition-all duration-200",
                      isKeycloakRoute
                        ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                        : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                    )}
                  >
                    <KeyRound className="h-4 w-4 shrink-0" />
                  </Link>
                  <Link
                    href="/openvpn/users"
                    title="OpenVPN"
                    className={cn(
                      "flex items-center justify-center rounded-lg border px-2.5 py-3 text-sm transition-all duration-200",
                      isOpenVpnRoute
                        ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                        : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                    )}
                  >
                    <Network className="h-4 w-4 shrink-0" />
                  </Link>
                </>
              ) : (
                <>
                  <Collapsible defaultOpen={isKeycloakRoute}>
                  <CollapsibleTrigger
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isKeycloakRoute
                          ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                          : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                      )}
                    >
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">Keycloak</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1.5 pl-2 border-l border-primary/20">
                      {keycloakItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-3 py-2.5 pl-9 text-sm transition-all duration-200",
                              isActive
                                ? "border-primary/40 bg-primary/10 text-primary font-medium"
                                : "border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible defaultOpen={isOpenVpnRoute}>
                  <CollapsibleTrigger
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                        isOpenVpnRoute
                          ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                          : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                      )}
                    >
                      <Network className="h-4 w-4 shrink-0" />
                      <span className="truncate">OpenVPN</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-1.5 pl-2 border-l border-primary/20">
                      {openVpnItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border px-3 py-2.5 pl-9 text-sm transition-all duration-200",
                              isActive
                                ? "border-primary/40 bg-primary/10 text-primary font-medium"
                                : "border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground",
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                </>
              )}

              {workspaceItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                        : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                      isCollapsed && "justify-center px-2.5",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span
                            className={cn(
                              "ml-auto rounded-lg bg-destructive/15 px-2 py-1 text-[10px] font-bold text-destructive",
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div>
            {!isCollapsed && (
              <p className="mb-3 px-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-primary/60 dark:text-primary/70">
                General
              </p>
            )}
            <nav className="space-y-1.5">
              {generalItems.map((item) => {
                const isActive = pathname === item.href

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                      isActive
                        ? "border-primary/50 bg-primary/15 text-primary shadow-lg shadow-primary/10"
                        : "border-transparent text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/30",
                      isCollapsed && "justify-center px-2.5",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {!isCollapsed && (
          <div className="mt-auto border-t border-primary/20 pt-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-sidebar-foreground">System Health</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">All systems operational</p>
              </div>
              <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-500 whitespace-nowrap">
                5/5 OK
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {platformStatus.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between rounded-lg px-3 py-2.5 bg-primary/5 border border-primary/20 hover:border-primary/40 transition-all">
                  <span className="text-sm font-medium text-sidebar-foreground">{platform.name}</span>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      platform.status === "Healthy" 
                        ? "bg-emerald-500/15 text-emerald-500" 
                        : "bg-amber-500/15 text-amber-500",
                    )}
                  >
                    {platform.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
