"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"

export function AppShell({
  children,
  contentClassName,
}: {
  children: ReactNode
  contentClassName?: string
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed((current) => !current)} />
      </div>

      <main
        className={cn(
          "relative min-h-screen p-4 transition-[margin,padding] duration-300 md:p-5 lg:p-6",
          isCollapsed ? "lg:ml-[5.5rem]" : "lg:ml-80",
          contentClassName,
        )}
      >
        <div className="mx-auto w-full max-w-[1680px]">{children}</div>
      </main>
    </div>
  )
}
