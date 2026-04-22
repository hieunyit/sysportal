import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SessionsContent } from "@/components/keycloak/sessions-content"

export default function SessionsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-6">
        <Header
          title="Keycloak Sessions"
          description="Track who is actively using the configured realm, review current user sessions, and surface repeated login failures before they turn into account lockouts."
        />

        <div className="mt-6">
          <SessionsContent />
        </div>
      </main>
    </div>
  )
}
