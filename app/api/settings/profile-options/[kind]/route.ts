import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { getProfileOptionLists, replaceProfileOptionList, type ProfileOptionKind } from "@/lib/settings-store"
import { formatZodError, profileOptionKindSchema, settingsOptionListSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function resolveKind(value: string): ProfileOptionKind | null {
  const parsed = profileOptionKindSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { kind } = await params
    const resolvedKind = resolveKind(kind)

    if (!resolvedKind) {
      return apiNotFound("Profile option list not found")
    }

    return apiSuccess({ kind: resolvedKind, items: getProfileOptionLists()[resolvedKind] })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load profile option list",
      detail: "Profile option storage is unavailable",
    })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { kind } = await params
    const resolvedKind = resolveKind(kind)

    if (!resolvedKind) {
      return apiNotFound("Profile option list not found")
    }

    const body = await request.json()
    const payload = settingsOptionListSchema.parse(body)
    return apiSuccess(replaceProfileOptionList(resolvedKind, payload.items))
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid profile option payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update profile option list",
      detail: "Profile option update failed",
    })
  }
}
