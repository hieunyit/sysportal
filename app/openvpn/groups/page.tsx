import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { OpenVpnGroupsContent } from "@/components/openvpn/groups-content"

export default function OpenVpnGroupsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="OpenVPN Groups"
          description="Manage OpenVPN access groups and memberships."
        />

        <div className="mt-4">
          <OpenVpnGroupsContent />
        </div>
      </main>
    </div>
  )
}
