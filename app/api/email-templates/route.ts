import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import {
  appendAuditLog,
  createEmailTemplate,
  listEmailTemplates,
} from "@/lib/settings-store"
import { emailTemplateSchema, formatZodError } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    const items = listEmailTemplates()

    return NextResponse.json({
      items,
      total: items.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load email templates",
        detail: getErrorDetail(error, "Email template storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const payload = emailTemplateSchema.parse(body)
    const created = createEmailTemplate(payload)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "email-template.created",
      resourceType: "email-template",
      resourceId: created.id,
      resourceName: created.name,
      detail: `Created template ${created.name}`,
      metadata: { category: created.category },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid email template payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to create email template",
        detail: getErrorDetail(error, "Template creation failed"),
      },
      { status: 500 },
    )
  }
}
