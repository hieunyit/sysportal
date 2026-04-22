"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Code2,
  Eye,
  FileCode2,
  LoaderCircle,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  buildPreviewDocument,
  EmailTemplate,
  extractTokens,
  formatTimestamp,
  getTemplateCategoryBadgeClass,
  parseSampleData,
  readResponseMessage,
  renderTemplateText,
  templateCategoryOptions,
  toDraft,
  type Notice,
  type TemplateDraft,
  type TemplateCategory,
} from "@/lib/email-template-utils"
import { cn } from "@/lib/utils"

interface EmailTemplateEditorProps {
  templateId: string
}

export function EmailTemplateEditor({ templateId }: EmailTemplateEditorProps) {
  const router = useRouter()
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    void loadTemplate(templateId)
  }, [templateId])

  async function loadTemplate(currentTemplateId: string) {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/email-templates/${currentTemplateId}`, { cache: "no-store" })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(readResponseMessage(payload, "Unable to load email template"))
      }

      setDraft(toDraft(payload as EmailTemplate))
      setError(null)
      setNotice(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load email template")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSaveTemplate() {
    if (!draft) {
      return
    }

    try {
      setIsSaving(true)
      const sampleData = parseSampleData(draft.sampleDataText)

      const response = await fetch(`/api/email-templates/${draft.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: draft.name,
          category: draft.category,
          subject: draft.subject,
          description: draft.description,
          html: draft.html,
          sampleData,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(readResponseMessage(payload, "Unable to save email template"))
      }

      setDraft(toDraft(payload as EmailTemplate))
      setNotice({ tone: "success", message: "Template changes saved." })
    } catch (saveError) {
      if (saveError instanceof SyntaxError) {
        setNotice({ tone: "error", message: "Fix the sample data JSON before saving." })
        return
      }

      setNotice({
        tone: "error",
        message: saveError instanceof Error ? saveError.message : "Unable to save email template",
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteTemplate() {
    if (!draft) {
      return
    }

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/email-templates/${draft.id}`, {
        method: "DELETE",
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(readResponseMessage(payload, "Unable to delete email template"))
      }

      router.push("/content-generator")
      router.refresh()
    } catch (deleteError) {
      setNotice({
        tone: "error",
        message: deleteError instanceof Error ? deleteError.message : "Unable to delete email template",
      })
      setIsDeleting(false)
    }
  }

  let renderedSampleData: Record<string, string> = {}
  let sampleDataError: string | null = null

  if (draft) {
    try {
      renderedSampleData = parseSampleData(draft.sampleDataText)
    } catch {
      sampleDataError = "Sample data JSON is invalid. Preview uses unresolved placeholders until this is fixed."
    }
  }

  const placeholderTokens = draft ? extractTokens(draft.subject, draft.html) : []
  const resolvedTokenCount = placeholderTokens.filter((token) => renderedSampleData[token]).length
  const renderedSubject = draft ? renderTemplateText(draft.subject, renderedSampleData) : ""
  const renderedHtml = draft ? renderTemplateText(draft.html, renderedSampleData) : ""

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[1.5rem] border border-dashed border-border bg-card">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Loading editor...
        </div>
      </div>
    )
  }

  if (error || !draft) {
    return (
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="space-y-4 p-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Template unavailable</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {error ?? "The requested template could not be found."}
            </p>
          </div>
          <Button asChild variant="outline" className="rounded-full px-5">
            <Link href="/content-generator">
              <ArrowLeft className="h-4 w-4" />
              Back to template library
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <Button asChild variant="ghost" className="h-9 rounded-full px-3 text-muted-foreground">
                <Link href="/content-generator">
                  <ArrowLeft className="h-4 w-4" />
                  Back to library
                </Link>
              </Button>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">{draft.name}</h2>
                  <Badge variant="outline" className={getTemplateCategoryBadgeClass(draft.category)}>
                    {draft.category}
                  </Badge>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Edit the metadata, HTML markup, and preview payload in a focused workspace instead of stacking every
                  tool on the library page.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="rounded-full px-5 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    Delete template
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this email template?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This removes the template from the library. Existing audit records remain in SQLite.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => void handleDeleteTemplate()}
                      className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete template
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button onClick={() => void handleSaveTemplate()} disabled={isSaving} className="rounded-full px-5">
                {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[1.25rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Last saved</p>
              <p className="mt-3 text-sm font-medium text-foreground">{formatTimestamp(draft.updatedAt)}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Placeholder tokens</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">{placeholderTokens.length}</p>
            </div>
            <div className="rounded-[1.25rem] border border-border bg-background p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resolved in preview</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {resolvedTokenCount}/{placeholderTokens.length || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {notice ? (
        <Alert variant={notice.tone === "error" ? "destructive" : "default"}>
          <AlertTitle>{notice.tone === "error" ? "Action failed" : "Saved"}</AlertTitle>
          <AlertDescription>{notice.message}</AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="details" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-[1.25rem] border border-border bg-card p-1">
          <TabsTrigger value="details" className="h-11 rounded-[1rem]">
            Details
          </TabsTrigger>
          <TabsTrigger value="markup" className="h-11 rounded-[1rem]">
            HTML
          </TabsTrigger>
          <TabsTrigger value="preview" className="h-11 rounded-[1rem]">
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[1fr,0.95fr]">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Template metadata</CardTitle>
                <CardDescription>Keep the purpose and subject line clear for operators.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template-name">Template name</Label>
                  <Input
                    id="template-name"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => (current ? { ...current, name: event.target.value } : current))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={draft.category}
                    onValueChange={(value) =>
                      setDraft((current) => (current ? { ...current, category: value as TemplateCategory } : current))
                    }
                  >
                    <SelectTrigger id="template-category" className="w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateCategoryOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-updated-at">Last saved</Label>
                  <Input id="template-updated-at" value={formatTimestamp(draft.updatedAt)} readOnly className="bg-muted" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template-subject">Subject</Label>
                  <Input
                    id="template-subject"
                    value={draft.subject}
                    onChange={(event) =>
                      setDraft((current) => (current ? { ...current, subject: event.target.value } : current))
                    }
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="template-description">Description</Label>
                  <Textarea
                    id="template-description"
                    value={draft.description}
                    onChange={(event) =>
                      setDraft((current) => (current ? { ...current, description: event.target.value } : current))
                    }
                    className="min-h-[120px] resize-y bg-background"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Preview data</CardTitle>
                <CardDescription>Sample JSON used to render placeholder values in the preview tab.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  value={draft.sampleDataText}
                  onChange={(event) =>
                    setDraft((current) => (current ? { ...current, sampleDataText: event.target.value } : current))
                  }
                  className="min-h-[360px] resize-y border-border bg-slate-950 font-mono text-xs leading-6 text-slate-50"
                />

                {sampleDataError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Invalid JSON</AlertTitle>
                    <AlertDescription>{sampleDataError}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Placeholder coverage
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {placeholderTokens.length === 0 ? (
                      <Badge variant="outline" className="rounded-full border-border bg-background text-muted-foreground">
                        No placeholders detected
                      </Badge>
                    ) : (
                      placeholderTokens.map((token) => (
                        <Badge
                          key={token}
                          variant="outline"
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs",
                            renderedSampleData[token]
                              ? "border-primary/25 bg-primary/10 text-primary"
                              : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300",
                          )}
                        >
                          {token}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="markup">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="border-b border-border">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <Code2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">HTML source</CardTitle>
                  <CardDescription>Editable markup for the message body that will be delivered by SMTP.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Textarea
                value={draft.html}
                onChange={(event) =>
                  setDraft((current) => (current ? { ...current, html: event.target.value } : current))
                }
                className="min-h-[720px] resize-y rounded-none border-0 bg-slate-950 px-5 py-5 font-mono text-xs leading-6 text-slate-50 shadow-none focus-visible:ring-0"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview">
          <div className="grid gap-6 xl:grid-cols-[320px,1fr]">
            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Render summary</CardTitle>
                    <CardDescription>Current subject and placeholder coverage for this preview.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[1.25rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Rendered subject</p>
                  <p className="mt-3 text-base font-semibold text-foreground">{renderedSubject}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border bg-background p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resolved placeholders</p>
                  <p className="mt-3 text-2xl font-semibold text-foreground">
                    {resolvedTokenCount}/{placeholderTokens.length || 0}
                  </p>
                </div>
                {sampleDataError ? (
                  <Alert variant="destructive">
                    <AlertTitle>Preview warning</AlertTitle>
                    <AlertDescription>{sampleDataError}</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-border bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">HTML preview</CardTitle>
                <CardDescription>Preview of the email body after sample data is applied.</CardDescription>
              </CardHeader>
              <CardContent>
                <iframe
                  title="Email preview"
                  sandbox=""
                  srcDoc={buildPreviewDocument(renderedHtml)}
                  className="h-[780px] w-full rounded-[1.5rem] border border-border bg-white"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
