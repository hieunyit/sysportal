import { Sidebar } from "@/components/dashboard/sidebar"
import { OpenVpnSubjectDetailContent } from "@/components/openvpn/subject-detail-content"

export default async function OpenVpnUserDetailPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-5">
        <OpenVpnSubjectDetailContent subjectType="user" name={name} />
      </main>
    </div>
  )
}
