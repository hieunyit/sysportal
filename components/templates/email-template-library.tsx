"use client"

import Link from "next/link"
import { useDeferredValue, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowRight,
  Clock3,
  FileCode2,
  Filter,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  Tags,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  EmailTemplate,
  formatTimestamp,
  getTemplateCategoryBadgeClass,
  newTemplateScaffold,
  readResponseMessage,
  templateCategoryOptions,
  type Notice,
  type TemplateCategory,
} from "@/lib/email-template-utils"
import { cn } from "@/lib/utils"

type CategoryFilter = "all" | TemplateCategory

const categoryFilters: Array<{ value: CategoryFilter; label: string }> = [
  { value: "all", label: "All templates" },
  ...templateCategoryOptions,
]

export function EmailTemplateLibrary() {
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    void loadTemplates()
  }, [])

  async function loadTemplates() {
    try {
      setIsLoading(true)
      const response = await fetch("/api/email-templates", { cache: "no-store" })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(readResponseMessage(payload, "Unable to load email templates"))
      }

      setTemplates((payload as { items: EmailTemplate[] }).items)
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load email templates")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateTemplate() {
    try {
      setIsCreating(true)
      setNotice(null)
      const response = await fetch("/api/email-templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTemplateScaffold),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(readResponseMessage(payload, "Unable to create email template"))
      }

      const created = payload as EmailTemplate
      router.push(`/content-generator/${created.id}`)
    } catch (createError) {
      setNotice({
        tone: "error",
        message: createError instanceof Error ? createError.message : "Unable to create email template",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = category === "all" || template.category === category
    const searchValue = deferredSearch.trim().toLowerCase()
    const matchesSearch =
      searchValue.length === 0 ||
      template.name.toLowerCase().includes(searchValue) ||
      template.description.toLowerCase().includes(searchValue) ||
      template.subject.toLowerCase().includes(searchValue)

    return matchesCategory && matchesSearch
  })

  const lastUpdated =
    templates
      .map((template) => template.updatedAt)
      .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null

  const activeCategories = new Set(templates.map((template) => template.category)).size

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load email templates</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {notice ? (
        <Alert variant={notice.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{notice.tone === "error" ? "Action failed" : "Done"}</AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border bg-card shadow-sm">
        <CardContent className="grid gap-6 p-6 xl:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-4">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">Template library</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Keep notification and onboarding emails in one controlled library, then open a dedicated workspace
                only when you need to edit HTML, subject, or preview data.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Templates</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{templates.length}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Categories</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{activeCategories}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last updated</p>
              <p className="mt-3 text-sm font-medium text-foreground">{formatTimestamp(lastUpdated)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-lg">Browse templates</CardTitle>
              <CardDescription>Filter by purpose, then open a template in its own editor.</CardDescription>
            </div>
            <Button onClick={() => void handleCreateTemplate()} disabled={isCreating} className="rounded-full px-5">
              {isCreating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isCreating ? "Creating..." : "New template"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, subject, or description"
                className="h-11 rounded-full bg-background pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((option) => {
                const isActive = category === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCategory(option.value)}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.value === "all" ? <Filter className="h-4 w-4" /> : <Tags className="h-4 w-4" />}
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-background">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading templates...
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-border bg-background px-6 py-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-base font-medium text-foreground">No templates match this filter</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Adjust the current search or category filter, or create a new template.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredTemplates.map((template) => (
                <Link
                  key={template.id}
                  href={`/content-generator/${template.id}`}
                  className="group rounded-[1.5rem] border border-border bg-background p-5 transition-all hover:border-primary/35 hover:shadow-[0_18px_40px_-32px_rgba(13,148,136,0.55)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold tracking-tight text-foreground">{template.name}</h3>
                        <Badge variant="outline" className={getTemplateCategoryBadgeClass(template.category)}>
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-muted-foreground">{template.description}</p>
                    </div>

                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground transition-colors group-hover:border-primary/25 group-hover:text-primary">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.25rem] border border-border bg-card p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Subject</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{template.subject}</p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Updated {formatTimestamp(template.updatedAt)}
                    </div>
                    <span className="font-medium text-foreground">Open editor</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
