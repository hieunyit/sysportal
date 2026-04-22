import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { TasksContent } from "@/components/tasks/tasks-content"
import { Button } from "@/components/ui/button"

export default function TasksPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Access requests"
          description="Manage entitlement grants, account recovery tickets, and approval items waiting on system owners."
          actions={
            <Button className="h-10 rounded-full px-5 text-sm">
              Create request
            </Button>
          }
        />

        <div className="mt-6">
          <TasksContent />
        </div>
      </main>
    </div>
  )
}
