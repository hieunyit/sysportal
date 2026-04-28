"use client"

import type { ReactNode } from "react"
import { Sidebar } from "./sidebar"

export function AppShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
