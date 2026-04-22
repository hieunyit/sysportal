import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { EmailTemplateLibrary } from "@/components/templates/email-template-library"

export default function ContentGeneratorPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-6">
        <Header
          title="Email Templates"
          description="Manage the HTML template library for operational notifications and new-joiner onboarding without crowding the screen with the full editor."
        />

        <div className="mt-6">
          <EmailTemplateLibrary />
        </div>
      </main>
    </div>
  )
}
