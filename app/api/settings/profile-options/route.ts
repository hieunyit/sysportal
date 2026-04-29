import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { getProfileOptionLists } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    return apiSuccess({ items: getProfileOptionLists() })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load profile option lists",
      detail: "Profile option storage is unavailable",
    })
  }
}
