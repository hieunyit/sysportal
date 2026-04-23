import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { UsersContent } from "@/components/keycloak/users-content"

export default function UsersPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Keycloak Users"
          description="Browse realm users and open direct account controls."
        />

        <div className="mt-6">
          <UsersContent />
        </div>
      </div>
    </AppShell>
  )
}
