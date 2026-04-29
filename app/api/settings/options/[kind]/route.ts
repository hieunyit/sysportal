import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { getSettingsOptionLists, replaceSettingsOptionList, type SettingsOptionKind } from "@/lib/settings-store"
import { formatZodError, settingsOptionKindSchema, settingsOptionListSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function resolveKind(value: string): SettingsOptionKind | null {
  const parsed = settingsOptionKindSchema.safeParse(value)
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
      return apiNotFound("Option list not found")
    }

    return apiSuccess({ kind: resolvedKind, items: getSettingsOptionLists()[resolvedKind] })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load option list",
      detail: "Settings option storage is unavailable",
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
      return apiNotFound("Option list not found")
    }

    const body = await request.json()
    const payload = settingsOptionListSchema.parse(body)
    return apiSuccess(replaceSettingsOptionList(resolvedKind, payload.items))
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid option list payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update option list",
      detail: "Settings option list update failed",
    })
  }
}
