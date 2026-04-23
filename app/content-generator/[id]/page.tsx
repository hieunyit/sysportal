import { AppShell } from "@/components/dashboard/app-shell"
import { Header } from "@/components/dashboard/header"
import { EmailTemplateEditor } from "@/components/templates/email-template-editor"

export default async function EmailTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <AppShell>
      <div>
        <Header
          title="Template Editor"
          description="Edit a single email template in a dedicated workspace with focused controls for metadata, HTML, and preview rendering."
        />

        <div className="mt-6">
          <EmailTemplateEditor templateId={id} />
        </div>
      </div>
    </AppShell>
  )
}
