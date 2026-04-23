"use client"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

export default function LogoutPage() {
  const router = useRouter()

  return (
    <AppShell>
      <div>
        <Header title="Logout" description="End the current operator session and return to the login experience." />

        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <Card className="max-w-md w-full space-y-6 p-8 text-center animate-fade-in">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <LogOut className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Confirm logout</h1>
              <p className="text-muted-foreground">Do you want to end the current operations session?</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => router.back()}>
                Go back
              </Button>
              <Button className="flex-1" onClick={() => router.push("/")}>
                Logout
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
