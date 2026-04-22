"use client"

import { Card } from "@/components/ui/card"

const stats = [
  {
    title: "Active Campaigns",
    value: "18",
    subtitle: "+5% vs last month",
  },
  {
    title: "Total Reach",
    value: "2.4M",
    subtitle: "Across all types",
  },
  {
    title: "Engagement Rate",
    value: "8.2%",
    subtitle: "4 of 6 completed",
  },
  {
    title: "Conversion Rate",
    value: "4.5",
    subtitle: "Rating this quarter",
  },
]

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.title} className="bg-card border border-border p-4 rounded-lg">
          <h3 className="text-xs text-muted-foreground font-medium mb-3">{stat.title}</h3>
          <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
        </Card>
      ))}
    </div>
  )
}
