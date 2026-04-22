import { Sidebar } from "@/components/dashboard/sidebar"
import { OpenVpnUsersContent } from "@/components/openvpn/users-content"

export default function OpenVpnUsersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-5">
        <OpenVpnUsersContent />
      </main>
    </div>
  )
}
