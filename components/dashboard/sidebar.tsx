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
        "flex flex-col overflow-y-auto border-r border-sidebar-border/80 bg-sidebar",
        mobile
          ? "h-full w-full"
          : "fixed left-0 top-0 z-30 h-screen transition-all duration-300 ease-in-out",
        !mobile && (isCollapsed ? "w-[4.75rem]" : "w-72"),
      )}
    >
      <div className={cn("flex h-full flex-col p-4", isCollapsed && "px-2.5")}>
        <div className={cn("mb-6 flex items-start gap-3", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <Link href="/" className="group">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/15">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-tight text-sidebar-foreground">IdentityOps Hub</p>
                    <p className="text-[11px] text-muted-foreground">Keycloak / OpenVPN / Jira / ServiceDesk</p>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {onToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className={cn(
                "mt-1 h-8 w-8 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/70",
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
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
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
                      "flex items-center justify-center rounded-lg border border-transparent px-2.5 py-3 text-sm transition-all",
                      isKeycloakRoute
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <KeyRound className="h-4 w-4 shrink-0" />
                  </Link>
                  <Link
                    href="/openvpn/users"
                    title="OpenVPN"
                    className={cn(
                      "flex items-center justify-center rounded-lg border border-transparent px-2.5 py-3 text-sm transition-all",
                      isOpenVpnRoute
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
                        "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-all",
                        isKeycloakRoute
                          ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <KeyRound className="h-4 w-4 shrink-0" />
                      <span className="truncate">Keycloak</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1.5 space-y-1.5">
                      {keycloakItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 pl-10 text-sm transition-all",
                              isActive
                                ? "border-sidebar-border bg-card text-sidebar-foreground"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible defaultOpen={isOpenVpnRoute}>
                  <CollapsibleTrigger
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-all",
                        isOpenVpnRoute
                          ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                      )}
                    >
                      <Network className="h-4 w-4 shrink-0" />
                      <span className="truncate">OpenVPN</span>
                      <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-1.5 space-y-1.5">
                      {openVpnItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                        return (
                          <Link
                            key={item.label}
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 pl-10 text-sm transition-all",
                              isActive
                                ? "border-sidebar-border bg-card text-sidebar-foreground"
                                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
                            )}
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
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
                      "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-all",
                      isActive
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
                              "ml-auto rounded-md bg-card px-2 py-0.5 text-[10px] font-semibold text-foreground",
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
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
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
                      "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm transition-all",
                      isActive
                        ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
          <div className="mt-auto border-t border-sidebar-border/80 pt-4">
            <div className="flex items-center justify-between px-3">
              <div>
                <p className="text-sm font-semibold text-sidebar-foreground">Platform status</p>
                <p className="text-xs text-muted-foreground">Fast health snapshot across core connectors</p>
              </div>
              <span className="rounded-md bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-500">
                4/5 OK
              </span>
            </div>

            <div className="mt-4 space-y-1.5">
              {platformStatus.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between rounded-lg px-3 py-2">
                  <span className="text-sm text-sidebar-foreground">{platform.name}</span>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      platform.status === "Healthy" ? "text-emerald-500" : "text-amber-500",
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
