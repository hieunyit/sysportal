"use client"

import { useState } from "react"
import { CalendarRange, CircleAlert, Filter, KeyRound, Search, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { accessRequests } from "@/lib/identity-ops-data"

function getStatusClass(status: string) {
  switch (status) {
    case "Pending approval":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    case "Needs input":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300"
    default:
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  }
}

export function TasksContent() {
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")

  const normalizedQuery = query.trim().toLowerCase()
  const filteredRequests = accessRequests.filter((request) => {
    const matchesFilter =
      filter === "all"
        ? true
        : filter === "pending"
          ? request.status === "Pending approval"
          : request.status === "Needs input"

    const matchesQuery =
      normalizedQuery.length === 0
        ? true
        : [request.title, request.requester, request.system, request.tag].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          )

    return matchesFilter && matchesQuery
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Queue filters</CardTitle>
            <CardDescription>Trim the backlog by SLA pressure, system owner, or request type.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by request name, requester, or system..."
                className="h-11 rounded-xl border-border/80 bg-background pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")} className="rounded-xl">
                All
              </Button>
              <Button
                variant={filter === "pending" ? "default" : "outline"}
                onClick={() => setFilter("pending")}
                className="rounded-xl"
              >
                Pending approval
              </Button>
              <Button
                variant={filter === "issue" ? "default" : "outline"}
                onClick={() => setFilter("issue")}
                className="rounded-xl"
              >
                Needs input
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Queue metrics</CardTitle>
            <CardDescription>Quick summary for the current shift and approver coverage.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Open requests", value: "36", icon: ShieldCheck },
              { label: "Due inside 2h", value: "8", icon: CircleAlert },
              { label: "Privileged scope", value: "11", icon: KeyRound },
              { label: "Change-linked items", value: "4", icon: CalendarRange },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/80 bg-muted/15 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="px-5 py-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold text-foreground">{request.title}</p>
                    <Badge variant="outline" className={getStatusClass(request.status)}>
                      {request.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.requester} | {request.system} | {request.tag}
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-xl border border-border/80 bg-muted/15 px-4 py-2 text-sm text-muted-foreground">
                    Due {request.dueDate}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="rounded-xl">
                      <Filter className="mr-2 h-4 w-4" />
                      View flow
                    </Button>
                    <Button className="rounded-xl">Approve</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
