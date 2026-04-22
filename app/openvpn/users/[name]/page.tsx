import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
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

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title={`OpenVPN User: ${name}`}
          description="View and manage user access and settings."
        />

        <div className="mt-4">
          <OpenVpnSubjectDetailContent subjectType="user" name={name} />
        </div>
      </main>
    </div>
  )
}
