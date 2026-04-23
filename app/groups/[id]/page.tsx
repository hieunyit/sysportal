import { AppShell } from "@/components/dashboard/app-shell"
import { GroupDetailContent } from "@/components/keycloak/group-detail-content"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AppShell>
      <GroupDetailContent groupId={id} />
    </AppShell>
  )
}
