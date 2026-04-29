import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { getAppearanceSettings, updateAppearanceSettings } from "@/lib/settings-store"
import { appearanceSettingsSchema, formatZodError } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    return apiSuccess(getAppearanceSettings())
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load appearance settings",
      detail: "Appearance settings storage is unavailable",
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
    const payload = appearanceSettingsSchema.parse(body)
    return apiSuccess(updateAppearanceSettings(payload))
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid appearance payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update appearance settings",
      detail: "Appearance settings update failed",
    })
  }
}
