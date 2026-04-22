import { Sidebar } from "@/components/dashboard/sidebar"
import { OpenVpnGroupsContent } from "@/components/openvpn/groups-content"

export default function OpenVpnGroupsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-5">
        <OpenVpnGroupsContent />
      </main>
    </div>
  )
}
