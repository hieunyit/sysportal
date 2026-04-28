import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import {
  appendAuditLog,
  deleteEmailTemplate,
  getEmailTemplate,
  updateEmailTemplate,
} from "@/lib/settings-store"
import { emailTemplateSchema, formatZodError } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { id } = await params
    const template = getEmailTemplate(id)

    if (!template) {
      return apiNotFound("Email template not found")
    }

    return apiSuccess(template)
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load email template",
      detail: "Email template storage is unavailable",
    })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { id } = await params
    const body = await request.json()
    const payload = emailTemplateSchema.parse(body)
    const updated = updateEmailTemplate(id, payload)

    if (!updated) {
      return apiNotFound("Email template not found")
    }

    appendAuditLog({
      actorName: auth.actorName,
      category: "edit",
      action: "email-template.updated",
      resourceType: "email-template",
      resourceId: updated.id,
      resourceName: updated.name,
      detail: `Updated HTML and metadata for ${updated.name}`,
      metadata: { category: updated.category },
    })

    return apiSuccess(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid email template payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update email template",
      detail: "Template update failed",
    })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { id } = await params
    const deleted = deleteEmailTemplate(id)

    if (!deleted) {
      return apiNotFound("Email template not found")
    }

    appendAuditLog({
      actorName: auth.actorName,
      category: "edit",
      action: "email-template.deleted",
      resourceType: "email-template",
      resourceId: deleted.id,
      resourceName: deleted.name,
      detail: `Deleted template ${deleted.name}`,
      metadata: { category: deleted.category },
    })

    return apiSuccess({ deleted: true, id: deleted.id, name: deleted.name })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to delete email template",
      detail: "Template deletion failed",
    })
  }
}
