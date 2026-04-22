import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { GroupsContent } from "@/components/keycloak/groups-content"

export default function GroupsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Keycloak Groups"
          description="Explore the live realm group hierarchy, including nesting depth, mapped roles, subgroup counts, and member relationships."
        />

        <div className="mt-6">
          <GroupsContent />
        </div>
      </main>
    </div>
  )
}
