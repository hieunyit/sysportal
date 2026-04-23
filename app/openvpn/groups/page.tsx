import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { OpenVpnGroupsContent } from "@/components/openvpn/groups-content"

export default function OpenVpnGroupsPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="OpenVPN Groups"
          description="Browse VPN groups, members, and shared policy controls."
        />

        <div className="mt-6">
        <OpenVpnGroupsContent />
        </div>
      </div>
    </AppShell>
  )
}
