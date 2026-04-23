import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { SessionsContent } from "@/components/keycloak/sessions-content"

export default function SessionsPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Keycloak Sessions"
          description="Track who is actively using the configured realm, review current user sessions, and surface repeated login failures before they turn into account lockouts."
        />

        <div className="mt-6">
          <SessionsContent />
        </div>
      </div>
    </AppShell>
  )
}
