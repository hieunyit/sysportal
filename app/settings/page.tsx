import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { SettingsContent } from "@/components/settings/settings-content"

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Workspace settings"
          description="Manage notification routing and workspace appearance without mixing in connector credentials."
        />

        <div className="mt-6">
          <SettingsContent />
        </div>
      </main>
    </div>
  )
}
