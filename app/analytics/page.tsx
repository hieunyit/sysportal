import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { AnalyticsContent } from "@/components/analytics/analytics-content"
import { Button } from "@/components/ui/button"

export default function AnalyticsPage() {
  return (
    <AppShell>
      <div>
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
      </div>
    </AppShell>
  )
}
