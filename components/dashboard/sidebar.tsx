"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileCode2,
  HelpCircle,
  KeyRound,
  LayoutDashboard,
  LogOut,
  ServerCog,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigationSections = [
  {
    label: "Command",
    items: [
      { icon: LayoutDashboard, label: "Overview", href: "/" },
      { icon: BarChart3, label: "Audit Log", href: "/analytics" },
    ],
  },
  {
    label: "Keycloak",
    items: [
      { icon: KeyRound, label: "Users", href: "/users" },
      { icon: Users, label: "Groups", href: "/groups" },
      { icon: Activity, label: "Sessions", href: "/sessions" },
    ],
  },
  {
    label: "OpenVPN",
    items: [
      { icon: UserRound, label: "Users", href: "/openvpn/users" },
      { icon: Users, label: "Groups", href: "/openvpn/groups" },
    ],
  },
  {
    label: "Admin",
    items: [
      { icon: ServerCog, label: "Connections", href: "/connections" },
      { icon: FileCode2, label: "Email Templates", href: "/content-generator" },
      { icon: Settings, label: "Settings", href: "/settings" },
      { icon: HelpCircle, label: "Support", href: "/help" },
      { icon: LogOut, label: "Logout", href: "/logout" },
    ],
  },
] as const

const liveSystems = [
  { name: "Keycloak", status: "Healthy" },
  { name: "OpenVPN", status: "Monitoring" },
  { name: "SMTP", status: "Healthy" },
] as const

interface SidebarProps {
  isCollapsed?: boolean
  mobile?: boolean
  onToggle?: () => void
}

export function Sidebar({ isCollapsed = false, mobile = false, onToggle }: SidebarProps = {}) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex flex-col overflow-y-auto border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-xl",
        mobile
          ? "h-full w-full"
          : "fixed left-0 top-0 z-30 h-screen transition-all duration-300 ease-in-out",
        !mobile && (isCollapsed ? "w-[5.5rem]" : "w-80"),
      )}
    >
      <div className={cn("flex h-full flex-col p-4", isCollapsed && "px-3")}>
        <div className={cn("mb-5 flex items-start gap-3", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
            <Link href="/" className="group">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/14 text-primary ring-1 ring-primary/15">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold tracking-[-0.03em] text-sidebar-foreground">IdentityOps</p>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Operations Console</p>
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
                "mt-1 h-8 w-8 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/75",
                isCollapsed && "mx-auto",
              )}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {!isCollapsed && (
          <div className="mb-4 flex items-center justify-between rounded-[1.1rem] border border-sidebar-border/80 bg-sidebar-accent/45 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
              <p className="mt-1 text-sm font-semibold text-sidebar-foreground">Identity operations</p>
            </div>
            <Badge className="border-emerald-500/20 bg-emerald-500/12 text-emerald-400">Live</Badge>
          </div>
        )}

        <div className="space-y-5">
          {navigationSections.map((section) => (
            <div key={section.label}>
              {!isCollapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  {section.label}
                </p>
              )}
              <nav className="space-y-1.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl border px-3 py-3 text-sm transition-all",
                        isActive
                          ? "border-sidebar-border bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                          : "border-transparent text-muted-foreground hover:border-sidebar-border/80 hover:bg-sidebar-accent/65 hover:text-sidebar-foreground",
                        isCollapsed && "justify-center px-2.5",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {isActive && <span className="ml-auto h-2 w-2 rounded-full bg-primary" />}
                        </>
                      )}
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>

        {!isCollapsed && (
          <div className="mt-auto rounded-[1.15rem] border border-sidebar-border/80 bg-sidebar-accent/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-sidebar-foreground">Connector status</p>
              <Badge className="border-primary/20 bg-primary/12 text-primary">Live</Badge>
            </div>

            <div className="mt-3 space-y-2">
              {liveSystems.map((platform) => (
                <div key={platform.name} className="flex items-center justify-between rounded-xl bg-sidebar px-3 py-2.5">
                  <span className="text-sm text-sidebar-foreground">{platform.name}</span>
                  <span className={cn("text-xs font-medium", platform.status === "Healthy" ? "text-emerald-400" : "text-amber-300")}>
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
