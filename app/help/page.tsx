import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { HelpContent } from "@/components/help/help-content"

export default function HelpPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Operations support"
          description="Runbooks, escalation guidance, and common troubleshooting answers for IAM and connected systems."
        />

        <div className="mt-6">
          <HelpContent />
        </div>
      </div>
    </AppShell>
  )
}
