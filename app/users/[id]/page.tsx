import { AppShell } from "@/components/dashboard/app-shell"
import { UserDetailContent } from "@/components/keycloak/user-detail-content"

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AppShell>
      <UserDetailContent userId={id} />
    </AppShell>
  )
}
