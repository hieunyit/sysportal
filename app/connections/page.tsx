import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { ConnectionSettingsContent } from "@/components/settings/connection-settings-content"

export default function ConnectionsPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Connections"
          description="Configure and verify identity, VPN, and email integrations."
        />

        <div className="mt-6">
          <ConnectionSettingsContent />
        </div>
      </div>
    </AppShell>
  )
}
