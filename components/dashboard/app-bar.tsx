"use client"

import { usePathname } from "next/navigation"
import { AccountMenu } from "./account-menu"
import { GlobalSearch } from "./global-search"
import { MobileNav } from "./mobile-nav"

const PAGE_LABELS: Record<string, string> = {
  "/": "Overview",
  "/analytics": "Audit Log",
  "/users": "Keycloak Users",
  "/groups": "Keycloak Groups",
  "/stale-users": "Stale Accounts",
  "/openvpn/users": "OpenVPN Users",
  "/openvpn/groups": "OpenVPN Groups",
  "/connections": "Connections",
  "/content-generator": "Email Templates",
  "/settings": "Settings",
  "/logout": "Logout",
}

function usePageLabel() {
  const pathname = usePathname()
  const exact = PAGE_LABELS[pathname]
  if (exact) return exact
  const parent = Object.keys(PAGE_LABELS)
    .filter((k) => k !== "/" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return parent ? PAGE_LABELS[parent] : ""
}

export function AppBar() {
  const pageLabel = usePageLabel()

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        {pageLabel && (
          <span className="hidden lg:block text-sm font-medium text-gray-500">
            {pageLabel}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:block w-56">
          <GlobalSearch />
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <AccountMenu />
      </div>
    </header>
  )
}
