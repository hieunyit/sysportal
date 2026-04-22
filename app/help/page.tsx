import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { HelpContent } from "@/components/help/help-content"

export default function HelpPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Operations support"
          description="Runbooks, escalation guidance, and common troubleshooting answers for IAM and connected systems."
        />

        <div className="mt-6">
          <HelpContent />
        </div>
      </main>
    </div>
  )
}
