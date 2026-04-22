import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { UserDetailContent } from "@/components/keycloak/user-detail-content"

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-6">
        <Header
          title="User Detail"
          description="Inspect a single Keycloak user with credential history, sessions, group assignments, role mappings, event timelines, and direct account controls."
        />

        <div className="mt-6">
          <UserDetailContent userId={id} />
        </div>
      </main>
    </div>
  )
}
