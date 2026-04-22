import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { TeamContent } from "@/components/team/team-content"
import { Button } from "@/components/ui/button"

export default function TeamPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-6">
        <Header
          title="Operations team"
          description="Owners, administrators, and on-shift operators for IAM, VPN, Jira, and ServiceDesk."
          actions={
            <Button className="h-10 rounded-full px-5 text-sm">
              Add owner
            </Button>
          }
        />

        <div className="mt-6">
          <TeamContent />
        </div>
      </main>
    </div>
  )
}
