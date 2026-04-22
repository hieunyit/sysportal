import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { ConnectionSettingsContent } from "@/components/settings/connection-settings-content"

export default function ConnectionsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Connections"
          description="Configure and verify identity, VPN, and email integrations."
        />

        <div className="mt-6">
          <ConnectionSettingsContent />
        </div>
      </main>
    </div>
  )
}
