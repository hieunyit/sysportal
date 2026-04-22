import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { UsersContent } from "@/components/keycloak/users-content"

export default function UsersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Keycloak Users"
          description="Browse the live user inventory for the configured realm."
        />

        <div className="mt-4">
          <UsersContent />
        </div>
      </main>
    </div>
  )
}
