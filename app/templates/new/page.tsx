"use client"

import React, { useState } from "react"
import { X } from "lucide-react"
import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const categories = [
  "Onboarding",
  "Access Review",
  "Password Reset",
  "Connector Alert",
  "Incident Update",
  "VPN Access",
  "Offboarding",
  "Approval Notice",
]

export default function NewTemplatePage() {
  const [title, setTitle] = useState("VPN Credential Delivery Notice")
  const [description, setDescription] = useState(
    "Operational email used when an OpenVPN account is created and temporary credentials need to be delivered with next-step guidance, security requirements, and escalation contacts.",
  )
  const [category, setCategory] = useState("VPN Access")
  const [tags, setTags] = useState<string[]>(["openvpn", "credential-delivery", "security", "operations"])
  const [tagInput, setTagInput] = useState("")
  const [content, setContent] = useState(`Subject: Your OpenVPN access is ready

Hello {{display_name}},

Your OpenVPN profile has been created for {{environment}}.

Access details:
- Username: {{username}}
- Temporary password: {{temporary_password}}
- MFA required: {{mfa_required}}

Required next steps:
1. Sign in and change your temporary password immediately.
2. Enroll the required MFA factor before using production routes.
3. Contact {{support_channel}} if your assigned routes or domain rules look incorrect.

If you did not request this access, reply to this message and contact the IAM support channel immediately.

Regards,
Identity Operations`)

  const handleAddTag = () => {
    const normalized = tagInput.trim()

    if (normalized && !tags.includes(normalized)) {
      setTags((current) => [...current, normalized])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((current) => current.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    console.log("[identityops] Template draft:", { title, description, category, tags, content })
  }

  return (
    <AppShell>
      <div>
        <Header
          title="Create operational template"
          description="Compose a reusable email template for onboarding, alerts, access recovery, or operational incident communication."
          actions={
            <>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Save draft
              </Button>
              <Button onClick={handleSubmit} className="w-full sm:w-auto">
                Publish template
              </Button>
            </>
          }
        />

        <div className="mt-6">
          <Card className="p-5 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  Template title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., VPN Credential Delivery Notice"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the operational purpose and expected trigger for this template."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-[110px] resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {categories.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={cn(
                        "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                        category === item
                          ? "border-primary/30 bg-primary text-primary-foreground"
                          : "border-border/70 bg-background/60 text-foreground hover:border-primary/20 hover:bg-accent/60",
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-foreground">
                  Tags
                </Label>
                <div className="mb-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {tag}
                      <button type="button" onClick={() => handleRemoveTag(tag)} className="transition-colors hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add tags and press Enter"
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline" className="bg-transparent">
                    Add tag
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use tags that help operators find the template quickly during delivery or incident response.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium text-foreground">
                  Template content
                </Label>
                <Textarea
                  id="content"
                  placeholder="Write the message body, placeholders, and operator guidance."
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="min-h-[320px] resize-y font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include placeholders, escalation instructions, and any security reminders the recipient must see.
                </p>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
