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
      <section className="group overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-card via-card to-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_32px_rgba(65,184,255,0.08)] backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_12px_40px_rgba(65,184,255,0.12)]">
        <div className="flex flex-col gap-4 border-b border-primary/10 px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <MobileNav />

            <Badge
              variant="outline"
              className="hidden h-9 items-center gap-2 rounded-lg border-primary/30 bg-primary/5 px-4 text-primary dark:text-primary md:inline-flex font-medium transition-all group-hover:border-primary/50 group-hover:bg-primary/10"
            >
              <ShieldCheck className="h-4 w-4" />
              Engineering Metrics
            </Badge>

            <div className="relative hidden flex-1 md:block xl:max-w-[32rem]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors group-hover:text-primary/60" />
              <Input
                placeholder="Search systems, incidents, metrics..."
                className="h-10 rounded-lg border-primary/20 bg-background/50 dark:bg-background/30 pl-11 pr-4 backdrop-blur-sm transition-all focus:border-primary/50 focus:bg-background dark:focus:bg-background/50 placeholder-muted-foreground/70"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 self-end xl:self-auto">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all">
              <Mail className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9 rounded-lg border border-primary/20 bg-primary/5 text-foreground hover:bg-primary/10 hover:border-primary/40 transition-all"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive animate-glow-pulse" />
            </Button>

            <AccountMenu />
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 py-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3 animate-fade-in">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/60 dark:text-primary/70">
              Pulse Control Center
            </p>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{title}</h1>
              <p className="mt-2 max-w-4xl text-base leading-relaxed text-muted-foreground dark:text-muted-foreground/90">{description}</p>
            </div>
          </div>

          {actions && <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">{actions}</div>}
        </div>
      </section>
    </header>
  )
}
