"use client"

import { startTransition, useDeferredValue, useEffect, useRef, useState } from "react"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface SearchResultItem {
  id: string
  title: string
  subtitle: string
  href: string
  badge: string
}

interface SearchSection {
  id: string
  label: string
  items: SearchResultItem[]
}

interface SearchResponse {
  query: string
  sections: SearchSection[]
}

const MIN_QUERY_LENGTH = 2

export function GlobalSearch() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [sections, setSections] = useState<SearchSection[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const trimmedQuery = query.trim()
  const shouldShowDropdown = isFocused && trimmedQuery.length > 0

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"

      if (!isShortcut) {
        return
      }

      event.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return
      }

      setIsFocused(false)
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("mousedown", handlePointerDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim()

    if (normalizedQuery.length < MIN_QUERY_LENGTH) {
      setSections([])
      setIsLoading(false)
      return
    }

    const abortController = new AbortController()

    async function runSearch() {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/search?query=${encodeURIComponent(normalizedQuery)}`, {
          signal: abortController.signal,
          cache: "no-store",
        })
        const payload = (await response.json().catch(() => null)) as SearchResponse | null

        if (!response.ok) {
          throw new Error("Search request failed")
        }

        setSections(payload?.sections ?? [])
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return
        }

        setSections([])
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    void runSearch()

    return () => {
      abortController.abort()
    }
  }, [deferredQuery])

  function handleSelect(href: string) {
    setIsFocused(false)
    setQuery("")
    setSections([])

    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <div ref={containerRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onFocus={() => setIsFocused(true)}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search users, groups, sessions, templates..."
        className="h-10 rounded-xl border-border bg-background/80 pl-10 pr-16 shadow-none transition-colors hover:border-primary/25 focus-visible:border-primary/30 focus-visible:ring-primary/10"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-border/80 bg-muted/25 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground md:inline-flex">
        Ctrl K
      </span>

      {shouldShowDropdown ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.55rem)] z-50 overflow-hidden rounded-2xl border border-border/80 bg-card/96 shadow-[0_28px_70px_-50px_rgba(15,23,42,0.96)] backdrop-blur-xl">
          {trimmedQuery.length < MIN_QUERY_LENGTH ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Type at least {MIN_QUERY_LENGTH} characters to search.
            </p>
          ) : null}

          {trimmedQuery.length >= MIN_QUERY_LENGTH && isLoading ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching...</p>
          ) : null}

          {trimmedQuery.length >= MIN_QUERY_LENGTH && !isLoading && sections.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">No matching results.</p>
          ) : null}

          {trimmedQuery.length >= MIN_QUERY_LENGTH && !isLoading && sections.length > 0 ? (
            <div className="max-h-[26rem] overflow-y-auto p-2">
              {sections.map((section) => (
                <section key={section.id} className="border-b border-border/60 px-2 py-2 last:border-b-0">
                  <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section.label}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(item.href)}
                        className={cn(
                          "flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/55",
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-foreground">{item.title}</span>
                            <Badge variant="outline" className="border-border/80 bg-background text-muted-foreground">
                              {item.badge}
                            </Badge>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
