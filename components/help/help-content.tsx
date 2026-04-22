"use client"

import { BookOpen, Mail, MessageCircle, Search, ShieldCheck } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { helpCategories, helpFaqs } from "@/lib/identity-ops-data"

const iconMap = {
  book: BookOpen,
  shield: ShieldCheck,
  message: MessageCircle,
  mail: Mail,
} as const

export function HelpContent() {
  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search runbooks, owners, or escalation steps..."
          className="h-11 rounded-xl border-border/80 bg-card pl-11"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {helpCategories.map((category) => {
          const Icon = iconMap[category.icon]

          return (
            <Card key={category.title}>
              <CardContent className="px-5 py-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{category.title}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Frequently asked questions</CardTitle>
          <CardDescription>Common scenarios across access operations, approvals, and identity platform support.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {helpFaqs.map((faq) => (
            <div key={faq.question} className="rounded-xl border border-border/80 bg-muted/15 p-4">
              <p className="font-medium text-foreground">{faq.question}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
