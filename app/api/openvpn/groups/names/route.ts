import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiSuccess } from "@/lib/api-response"
import { createOpenVpnAdminClient } from "@/lib/openvpn-admin"

export const runtime = "nodejs"
const GROUP_NAMES_CACHE_TTL_MS = 60_000

declare global {
  var __identityOpsOpenVpnGroupNamesCache__:
    | {
        names: string[]
        expiresAt: number
      }
    | undefined
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const cached = globalThis.__identityOpsOpenVpnGroupNamesCache__

    if (cached && cached.expiresAt > Date.now()) {
      return apiSuccess({ names: cached.names, total: cached.names.length })
    }

    const client = await createOpenVpnAdminClient()
    const profiles = await client.listAllGroups({ enumerateMembers: false })
    const names = profiles
      .map((p) => p.name)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b))

    globalThis.__identityOpsOpenVpnGroupNamesCache__ = {
      names,
      expiresAt: Date.now() + GROUP_NAMES_CACHE_TTL_MS,
    }

    return apiSuccess({ names, total: names.length })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load OpenVPN groups",
      detail: "OpenVPN group list is unavailable",
      source: "openvpn",
    })
  }
}
