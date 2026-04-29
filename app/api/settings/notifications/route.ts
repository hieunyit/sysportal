import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { listNotificationSettings, replaceNotificationSettings } from "@/lib/settings-store"
import { formatZodError, notificationSettingsSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const items = listNotificationSettings()
    return apiSuccess({ items, total: items.length })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load notification settings",
      detail: "Notification settings storage is unavailable",
    })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const body = await request.json()
    const payload = notificationSettingsSchema.parse(body)
    const items = replaceNotificationSettings(payload.items)
    return apiSuccess({ items, total: items.length })
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid notification payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update notification settings",
      detail: "Notification settings update failed",
    })
  }
}
