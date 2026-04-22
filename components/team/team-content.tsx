"use client"

import { Mail, Phone, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { teamMembers } from "@/lib/identity-ops-data"

function getStatusClass(status: string) {
  switch (status) {
    case "On call":
      return "border-cyan-500/20 bg-cyan-500/10 text-cyan-300"
    case "Reviewing":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300"
    default:
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
  }
}

export function TeamContent() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Operations roster</CardTitle>
          <CardDescription>Owners and administrators responsible for identity, VPN, Jira, and ServiceDesk operations.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {teamMembers.map((member) => (
            <div key={member.id} className="rounded-xl border border-border/80 bg-muted/15 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border border-primary/20">
                    <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                    <AvatarFallback>{member.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-lg font-semibold text-foreground">{member.name}</p>
                    <p className="text-sm text-muted-foreground">{member.role}</p>
                  </div>
                </div>
                <Badge variant="outline" className={getStatusClass(member.status)}>
                  {member.status}
                </Badge>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  {member.systems}
                </div>
                <p className="text-sm text-muted-foreground">{member.queue}</p>
              </div>

              <div className="mt-5 flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl bg-transparent">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl bg-transparent">
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
