import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { Button } from "@/components/ui/button"

export default function AnalyticsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 transition-all duration-300 md:p-4 lg:ml-72 lg:p-5">
        <Header
          title="Audit Log"
          description="Review access, configuration, and connector activity across the entire control plane from one consolidated audit console."
          actions={
            <Button variant="outline" className="h-10 rounded-full bg-transparent px-5 text-sm">
              Export audit log
            </Button>
          }
        />

        <div className="mt-6">
          <AnalyticsContent />
        </div>
      </main>
    </div>
  )
}
