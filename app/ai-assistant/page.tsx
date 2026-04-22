"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bot, Send, Sparkles, TrendingUp, Target, MessageSquare } from "lucide-react"
import { useState } from "react"

export default function AIAssistantPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello. I am your identity operations assistant. I can help with access reviews, approval summaries, entitlement analysis, and troubleshooting guidance across Keycloak, OpenVPN, Jira, and ServiceDesk.",
    },
  ])
  const [input, setInput] = useState("")

  const suggestions = [
    { icon: TrendingUp, text: "Analyze approval backlog trends", color: "text-blue-500" },
    { icon: Target, text: "Recommend role cleanup priorities", color: "text-purple-500" },
    { icon: Sparkles, text: "Generate an access review summary", color: "text-pink-500" },
    { icon: MessageSquare, text: "Draft an incident update", color: "text-green-500" },
  ]

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="AI assistant"
          description="Get operational guidance for identity governance, approvals, and platform troubleshooting."
          actions={
            <>
              <Button className="h-10 w-full rounded-xl text-sm sm:w-auto">
                <Sparkles className="w-4 h-4 mr-2" />
                New chat
              </Button>
            </>
          }
        />

        <div className="mt-4 md:mt-5 space-y-3 md:space-y-4">
          <Card className="overflow-hidden">
            <div className="flex flex-col h-[calc(100vh-280px)]">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}

                {messages.length === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                    {suggestions.map((suggestion, index) => (
                      <Card
                        key={index}
                        className="cursor-pointer p-4 transition-colors hover:border-primary/25"
                      >
                        <div className="flex items-center gap-3">
                          <suggestion.icon className={`w-5 h-5 ${suggestion.color}`} />
                          <p className="text-sm font-medium text-foreground">{suggestion.text}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border/80 p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about approvals, identity sync, connector health, or role governance..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 border-border/80 bg-background"
                  />
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  AI can make mistakes. Verify important information.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
