import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { EmailTemplateLibrary } from "@/components/templates/email-template-library"

export default function ContentGeneratorPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Email Templates"
          description="Manage the HTML template library for operational notifications and new-joiner onboarding without crowding the screen with the full editor."
        />

        <div className="mt-6">
          <EmailTemplateLibrary />
        </div>
      </div>
    </AppShell>
  )
}
