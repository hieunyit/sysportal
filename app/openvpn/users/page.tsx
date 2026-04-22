import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { OpenVpnUsersContent } from "@/components/openvpn/users-content"

export default function OpenVpnUsersPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="OpenVPN Users"
          description="Manage OpenVPN user accounts and access policies."
        />

        <div className="mt-4">
          <OpenVpnUsersContent />
        </div>
      </main>
    </div>
  )
}
