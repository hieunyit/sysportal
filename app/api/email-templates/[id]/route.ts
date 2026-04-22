import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import {
  appendAuditLog,
  deleteEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
} from "@/lib/settings-store"
import { emailTemplateSchema, formatZodError } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const template = getEmailTemplate(id)

    if (!template) {
      return NextResponse.json({ error: "Email template not found" }, { status: 404 })
    }

    appendAuditLog({
      actorName: "Identity Admin",
      category: "access",
      action: "email-template.viewed",
      resourceType: "email-template",
      resourceId: template.id,
      resourceName: template.name,
      detail: `Opened template ${template.name}`,
      metadata: { category: template.category },
    })

    return NextResponse.json(template)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load email template",
        detail: getErrorDetail(error, "Email template storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const payload = emailTemplateSchema.parse(body)
    const updated = updateEmailTemplate(id, payload)

    if (!updated) {
      return NextResponse.json({ error: "Email template not found" }, { status: 404 })
    }

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "email-template.updated",
      resourceType: "email-template",
      resourceId: updated.id,
      resourceName: updated.name,
      detail: `Updated HTML and metadata for ${updated.name}`,
      metadata: { category: updated.category },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid email template payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update email template",
        detail: getErrorDetail(error, "Template update failed"),
      },
      { status: 500 },
    )
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const deleted = deleteEmailTemplate(id)

    if (!deleted) {
      return NextResponse.json({ error: "Email template not found" }, { status: 404 })
    }

    appendAuditLog({
      actorName: "Identity Admin",
      category: "action",
      action: "email-template.deleted",
      resourceType: "email-template",
      resourceId: deleted.id,
      resourceName: deleted.name,
      detail: `Deleted template ${deleted.name}`,
      metadata: { category: deleted.category },
    })

    return NextResponse.json({ deleted: true, id: deleted.id, name: deleted.name })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to delete email template",
        detail: getErrorDetail(error, "Template deletion failed"),
      },
      { status: 500 },
    )
  }
}
