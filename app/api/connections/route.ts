import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { getSystemSettings, sanitizeSystemSettings } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const system = sanitizeSystemSettings(getSystemSettings())
    const items = [
      {
        id: "keycloak",
        config: system.keycloak,
        updatedAt: system.updatedAt,
      },
      {
        id: "openvpn",
        config: system.openvpn,
        updatedAt: system.updatedAt,
      },
      {
        id: "smtp",
        config: system.smtp,
        updatedAt: system.updatedAt,
      },
      {
        id: "smtp-welcome",
        config: system.smtpWelcome,
        updatedAt: system.updatedAt,
      },
    ]

    return apiSuccess({
      items,
      total: items.length,
      updatedAt: system.updatedAt,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load connections",
      detail: "Connection storage is unavailable",
    })
  }
}
