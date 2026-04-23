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
    <header className="relative overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/92 shadow-[0_20px_50px_-42px_rgba(15,23,42,0.9)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.1),transparent_24%)]" />

      <section className="relative">
        <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-3.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <MobileNav />

            <Badge className="hidden h-8 items-center gap-2 border-primary/25 bg-primary/12 px-3 text-primary md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              IdentityOps
            </Badge>

            <div className="relative hidden flex-1 md:block xl:max-w-[32rem]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users, groups, sessions, templates..." className="pl-10 pr-4" />
            </div>
          </div>

          <div className="flex items-center gap-2 self-end xl:self-auto">
            <Button variant="outline" size="icon" className="h-9 w-9 bg-background/70 shadow-none">
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="relative h-9 w-9 bg-background/70 shadow-none">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <AccountMenu />
          </div>
        </div>

        <div className="px-5 py-4 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl space-y-2">
              <p className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/55 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Identity operations
              </p>
              <div>
                <h1 className="text-[1.85rem] font-semibold tracking-[-0.04em] text-foreground md:text-[2.1rem]">{title}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-5 text-muted-foreground">{description}</p>
              </div>
            </div>

            {actions ? <div className="flex flex-col gap-2 sm:flex-row xl:justify-end">{actions}</div> : null}
          </div>
        </div>
      </section>
    </header>
  )
}
