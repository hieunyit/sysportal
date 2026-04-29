import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { getSettingsBundle } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    return apiSuccess(getSettingsBundle())
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load settings bundle",
      detail: "Settings storage is unavailable",
    })
  }
}
