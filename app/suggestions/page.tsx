"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Wand2, TrendingUp, Users, Target, DollarSign, Clock, ArrowRight, Lightbulb } from "lucide-react"

export default function SmartSuggestionsPage() {
  const suggestions = [
    {
      category: "Access Governance",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      items: [
        {
          title: "Review privileged bundles first",
          description: "Privileged bundles have the highest approval wait time and the highest audit impact this week",
          impact: "High",
          effort: "Medium",
        },
        {
          title: "Move owner reminders earlier",
          description: "Requests with reminder nudges before noon close 31% faster in your current queue",
          impact: "Medium",
          effort: "Low",
        },
      ],
    },
    {
      category: "Connector Optimization",
      icon: Lightbulb,
      color: "from-purple-500 to-pink-500",
      items: [
        {
          title: "Re-run delayed ServiceDesk webhooks",
          description: "Approval latency suggests webhook retries are stacking up in the ServiceDesk queue",
          impact: "High",
          effort: "High",
        },
        {
          title: "Standardize Jira role mappings",
          description: "Converting 18 manual grants into governed mappings will reduce rework during quarterly reviews",
          impact: "Medium",
          effort: "Low",
        },
      ],
    },
    {
      category: "Lifecycle Automation",
      icon: DollarSign,
      color: "from-emerald-500 to-green-500",
      items: [
        {
          title: "Expand HR-driven auto-provisioning",
          description: "Joiner tickets routed from HR data can eliminate 2.3 hours of manual work each day",
          impact: "High",
          effort: "Low",
        },
        {
          title: "Auto-close stale recovery tickets",
          description: "Recovery tickets with no user response after 48 hours are dragging team focus",
          impact: "Medium",
          effort: "Low",
        },
      ],
    },
    {
      category: "Operational Throughput",
      icon: TrendingUp,
      color: "from-orange-500 to-red-500",
      items: [
        {
          title: "Split vendor certificate renewals by owner",
          description: "Separating vendor renewals by owner can cut approval wait time by 15%",
          impact: "Medium",
          effort: "Low",
        },
        {
          title: "Raise sync job observability",
          description: "Adding deeper retry signals around connector jobs will reduce escalation time during incidents",
          impact: "High",
          effort: "Medium",
        },
      ],
    },
  ]

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "High":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
      case "Medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Smart suggestions"
          description="AI-generated recommendations for identity operations, governance, and connector performance."
          actions={
            <>
              <Button className="w-full sm:w-auto h-9 text-sm bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30 hover:scale-105">
                <Wand2 className="w-4 h-4 mr-2" />
                Refresh suggestions
              </Button>
            </>
          }
        />

        <div className="mt-4 md:mt-5 space-y-3 md:space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <Target className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Suggestions</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">24</p>
              <p className="text-xs text-muted-foreground mt-1">Active recommendations</p>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Potential Gain</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">+32%</p>
              <p className="text-xs text-muted-foreground mt-1">Estimated throughput gain</p>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Quick Wins</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">8</p>
              <p className="text-xs text-muted-foreground mt-1">Low effort, high impact</p>
            </Card>

            <Card className="p-4 bg-card border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-semibold text-foreground">Implemented</h3>
              </div>
              <p className="text-2xl font-bold text-foreground">12</p>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </Card>
          </div>

          <div className="space-y-4">
            {suggestions.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="p-4 md:p-6 bg-card border-border">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center`}>
                    <category.icon className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{category.category}</h2>
                </div>
                <div className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <Card
                      key={itemIndex}
                      className="p-4 bg-background border-border hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getImpactColor(item.impact)}`}>
                              {item.impact} Impact
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                              {item.effort} Effort
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 flex-shrink-0"
                        >
                          Apply
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
