import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { CalendarContent } from "@/components/calendar/calendar-content"
import { Button } from "@/components/ui/button"

export default function CalendarPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Change windows"
          description="Track maintenance windows, synchronization batches, and daily milestones that require owner coordination."
          actions={
            <Button className="h-10 rounded-full px-5 text-sm">
              Create change window
            </Button>
          }
        />

        <div className="mt-6">
          <CalendarContent />
        </div>
      </main>
    </div>
  )
}
