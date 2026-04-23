import { AppShell } from "@/components/dashboard/app-shell"
import { OpenVpnSubjectDetailContent } from "@/components/openvpn/subject-detail-content"

export default async function OpenVpnUserDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params

  return (
    <AppShell>
      <OpenVpnSubjectDetailContent subjectType="user" name={name} />
    </AppShell>
  )
}
