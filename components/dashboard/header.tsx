"use client"

import type { ReactNode } from "react"
import { AccountMenu } from "./account-menu"
import { GlobalSearch } from "./global-search"
import { MobileNav } from "./mobile-nav"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="shrink-0 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between gap-4 px-6 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <MobileNav />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 leading-tight">{title}</h1>
            <p className="text-sm text-gray-500 leading-tight mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block w-56">
            <GlobalSearch />
          </div>
          <AccountMenu />
        </div>
      </div>

      {actions && (
        <div className="px-6 pb-3.5 flex flex-col gap-2 sm:flex-row">{actions}</div>
      )}
    </header>
  )
}
