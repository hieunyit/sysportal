"use client"

import React from "react"

import { useState } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const categories = [
  "Email Marketing",
  "Social Media",
  "Content Marketing",
  "SEO",
  "Paid Advertising",
  "Analytics",
  "Brand Strategy",
  "Product Launch",
]

export default function NewTemplatePage() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [title, setTitle] = useState("Black Friday Email Campaign Template")
  const [description, setDescription] = useState(
    "A proven email marketing campaign template for Black Friday promotions. This template includes compelling subject lines, engaging email copy, and conversion-optimized CTAs. Perfect for e-commerce brands looking to maximize their holiday sales with a structured 3-email sequence.",
  )
  const [category, setCategory] = useState("Email Marketing")
  const [tags, setTags] = useState<string[]>(["email", "black-friday", "e-commerce", "holiday", "sales"])
  const [tagInput, setTagInput] = useState("")
  const [content, setContent] = useState(
    `EMAIL 1: TEASER (Send 3 days before)
Subject: 🔥 Our BIGGEST Sale of the Year is Coming...
Preview: You won't want to miss this. Early access starts soon.

Hey [First Name],

Something BIG is coming this Black Friday.

We're talking:
→ Up to 60% OFF sitewide
→ Free shipping on all orders
→ Exclusive early access for subscribers

Mark your calendar: November 24th at midnight.

But here's the thing... our VIP subscribers get early access 24 hours before everyone else.

Want in? 

[CTA: Get Early Access]

Talk soon,
[Your Name]

---

EMAIL 2: LAUNCH (Black Friday morning)
Subject: 🎉 IT'S HERE! 60% OFF Everything
Preview: Limited time only. Shop now before it's gone.

[First Name], it's LIVE! 🎊

Our biggest sale of the year is officially here.

For the next 48 hours ONLY:
✓ 60% OFF all products
✓ FREE worldwide shipping
✓ No code needed - discount applied at checkout

[CTA: Shop Black Friday Deals]

Popular picks flying off the shelves:
• Best Seller #1 - Only 12 left
• New Arrival #2 - 45% claimed
• Customer Favorite #3 - Almost gone

Don't wait. These deals won't last.

Happy shopping!
[Your Name]

---

EMAIL 3: LAST CHANCE (Final 6 hours)
Subject: ⏰ FINAL HOURS: Black Friday Ends Tonight
Preview: This is your last chance for 60% OFF

[First Name],

This is it. Your last chance.

In just 6 hours, our Black Friday sale ends and prices go back to normal.

🔥 60% OFF Everything
🔥 FREE Shipping
🔥 Ending at MIDNIGHT

[CTA: Shop Final Hours]

Still shopping? Here's what's trending:
1. [Product Name] - Almost sold out
2. [Product Name] - Back in stock
3. [Product Name] - Limited quantities

Once midnight hits, these prices are gone for good.

Last call,
[Your Name]

P.S. Already sold out of something you wanted? Join the waitlist and we'll restock for Cyber Monday.

[CTA: See All Deals]`,
  )

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleAddTag()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[v0] Template submission:", { title, description, category, tags, content })
    // Handle template submission
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </div>

      <main
        className={cn(
          "flex-1 p-4 md:p-5 lg:p-6 transition-all duration-300",
          isCollapsed ? "lg:ml-16" : "lg:ml-60",
        )}
      >
        <Header
          title="Create Campaign Template"
          description="Share your campaign template with the community"
          actions={
            <>
              <Button variant="outline" className="w-full sm:w-auto h-9 px-4 text-sm font-medium rounded-lg bg-transparent">
                Save as Draft
              </Button>
              <Button
                onClick={handleSubmit}
                className="w-full sm:w-auto h-9 px-4 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg"
              >
                Publish Template
              </Button>
            </>
          }
        />

        <div className="mt-4 md:mt-5">
          <Card className="bg-card border border-border p-5 rounded-lg">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-foreground">
                  Template Title
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Black Friday Email Campaign"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-9 text-sm"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your campaign template, its goals, and best use cases..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] text-sm resize-none"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                        category === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:bg-secondary",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags" className="text-sm font-medium text-foreground">
                  Tags
                </Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary text-foreground text-xs font-medium rounded-md border border-border"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    id="tags"
                    placeholder="Add tags (press Enter)"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-9 text-sm flex-1"
                  />
                  <Button type="button" onClick={handleAddTag} variant="outline" className="h-9 px-4 text-sm bg-transparent">
                    Add Tag
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Add relevant keywords to help others find your template</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-sm font-medium text-foreground">
                  Template Content
                </Label>
                <Textarea
                  id="content"
                  placeholder="Paste or write your campaign template content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[300px] text-sm font-mono resize-y"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include email copy, subject lines, social media posts, or any campaign materials
                </p>
              </div>
            </form>
          </Card>
        </div>
      </main>
    </div>
  )
}
