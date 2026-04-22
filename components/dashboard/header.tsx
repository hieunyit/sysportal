"use client"

import type { ReactNode } from "react"
import { Bell, Mail, Search, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AccountMenu } from "./account-menu"
import { MobileNav } from "./mobile-nav"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header>
      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 border-b border-border/80 px-5 py-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <MobileNav />

            <Badge
              variant="outline"
              className="hidden h-8 items-center gap-2 rounded-lg border-border/80 bg-muted/30 px-3 text-foreground md:inline-flex"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Operations Console
            </Badge>

            <div className="relative hidden flex-1 md:block xl:max-w-[28rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search identities, tickets, systems, access groups..."
                className="h-10 rounded-lg border-border/80 bg-background pl-10 pr-4"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end xl:self-auto">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-border/80 bg-background">
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg border border-border/80 bg-background"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <AccountMenu />
          </div>
        </div>

        <div className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Identity and Access Operations
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          </div>

          {actions && <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">{actions}</div>}
        </div>
      </section>
    </header>
  )
}
