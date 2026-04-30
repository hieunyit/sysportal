import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { StaleUsersContent } from "@/components/keycloak/stale-users-content"

export default function StaleUsersPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Stale Accounts"
          description="Enabled Keycloak accounts with no recorded login within the selected threshold."
        />
        <div className="mt-6">
          <StaleUsersContent />
        </div>
      </div>
    </AppShell>
  )
}
