import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import {
  appendAuditLog,
  createEmailTemplate,
  listEmailTemplates,
} from "@/lib/settings-store"
import { emailTemplateSchema, formatZodError } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const items = listEmailTemplates()
    return apiSuccess({ items, total: items.length })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load email templates",
      detail: "Email template storage is unavailable",
    })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const body = await request.json()
    const payload = emailTemplateSchema.parse(body)
    const created = createEmailTemplate(payload)

    appendAuditLog({
      actorName: auth.actorName,
      category: "edit",
      action: "email-template.created",
      resourceType: "email-template",
      resourceId: created.id,
      resourceName: created.name,
      detail: `Created template ${created.name}`,
      metadata: { category: created.category },
    })

    return apiSuccess(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid email template payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to create email template",
      detail: "Template creation failed",
    })
  }
}
