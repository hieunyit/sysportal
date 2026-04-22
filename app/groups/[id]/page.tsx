import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { GroupDetailContent } from "@/components/keycloak/group-detail-content"

export default async function GroupDetailPage({
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

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Group Detail"
          description="Inspect a single Keycloak group with hierarchy context, member list, mapped roles, and recent admin activity."
        />

        <div className="mt-6">
          <GroupDetailContent groupId={id} />
        </div>
      </main>
    </div>
  )
}
