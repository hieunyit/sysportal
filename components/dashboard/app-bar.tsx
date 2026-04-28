"use client"

import { AccountMenu } from "./account-menu"
import { GlobalSearch } from "./global-search"
import { MobileNav } from "./mobile-nav"

export function AppBar() {
  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
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
