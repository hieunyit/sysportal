import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { OpenVpnUsersContent } from "@/components/openvpn/users-content"

export default function OpenVpnUsersPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="OpenVPN Users"
          description="Browse VPN users and open direct policy controls."
        />

        <div className="mt-6">
        <OpenVpnUsersContent />
        </div>
      </div>
    </AppShell>
  )
}
