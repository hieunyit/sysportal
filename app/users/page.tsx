import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { UsersContent } from "@/components/keycloak/users-content"

export default function UsersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-6">
        <Header
          title="Keycloak Users"
          description="Browse the live user inventory for the configured realm and jump into create, edit, disable, password reset, and session control actions."
        />

        <div className="mt-6">
          <UsersContent />
        </div>
      </main>
    </div>
  )
}
