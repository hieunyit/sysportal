import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Workspace settings"
          description="Manage notification routing and workspace appearance without mixing in connector credentials."
        />

        <div className="mt-6">
          <SettingsContent />
        </div>
      </div>
    </AppShell>
  )
}
