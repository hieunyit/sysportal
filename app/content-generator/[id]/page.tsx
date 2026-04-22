import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { EmailTemplateEditor } from "@/components/templates/email-template-editor"

export default async function EmailTemplateEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:ml-72 lg:p-6">
        <Header
          title="Template Editor"
          description="Edit a single email template in a dedicated workspace with focused controls for metadata, HTML, and preview rendering."
        />

        <div className="mt-6">
          <EmailTemplateEditor templateId={id} />
        </div>
      </main>
    </div>
  )
}
