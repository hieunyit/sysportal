import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { getNotificationSetting, updateNotificationSetting } from "@/lib/settings-store"
import { formatZodError, notificationSettingPatchSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { id } = await params
    const item = getNotificationSetting(id)

    if (!item) {
      return apiNotFound("Notification setting not found")
    }

    return apiSuccess(item)
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load notification setting",
      detail: "Notification settings storage is unavailable",
    })
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { id } = await params
    const body = await request.json()
    const payload = notificationSettingPatchSchema.parse(body)
    const item = updateNotificationSetting(id, payload)

    if (!item) {
      return apiNotFound("Notification setting not found")
    }

    return apiSuccess(item)
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid notification patch payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update notification setting",
      detail: "Notification setting update failed",
    })
  }
}
