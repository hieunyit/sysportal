import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess, apiValidationError } from "@/lib/api-response"
import { getProfileSettingsBundle, updateProfileSettings } from "@/lib/settings-store"
import { formatZodError, profileSettingsSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    return apiSuccess(getProfileSettingsBundle())
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load profile settings",
      detail: "Profile settings storage is unavailable",
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
    const payload = profileSettingsSchema.parse(body)
    return apiSuccess(updateProfileSettings(payload))
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid profile payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update profile settings",
      detail: "Profile settings update failed",
    })
  }
}
