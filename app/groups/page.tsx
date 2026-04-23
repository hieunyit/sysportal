import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { GroupsContent } from "@/components/keycloak/groups-content"

export default function GroupsPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Keycloak Groups"
          description="Browse realm groups, structure, and role mappings."
        />

        <div className="mt-6">
          <GroupsContent />
        </div>
      </div>
    </AppShell>
  )
}
