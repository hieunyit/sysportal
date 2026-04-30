import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { DirectoryOptionListsContent } from "@/components/settings/option-lists-content"

export default function UserCatalogsPage() {
  return (
    <AppShell>
      <div>
        <Header
          title="Keycloak Directory Catalogs"
          description="Manage department and work address values used during Keycloak user creation and employee onboarding."
        />

        <div className="mt-6">
          <DirectoryOptionListsContent />
        </div>
      </div>
    </AppShell>
  )
}
