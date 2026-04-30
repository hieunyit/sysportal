import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { listAuthUsers } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const users = listAuthUsers()
    return apiSuccess({ items: users, total: users.length })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load access users",
      detail: "Failed to list authenticated users",
    })
  }
}
