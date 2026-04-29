import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { getDirectoryOptionLists, replaceDirectoryOptionList, type DirectoryOptionKind } from "@/lib/settings-store"
import { directoryOptionKindSchema, formatZodError, settingsOptionListSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function resolveKind(value: string): DirectoryOptionKind | null {
  const parsed = directoryOptionKindSchema.safeParse(value)
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
      return apiNotFound("Directory option list not found")
    }

    return apiSuccess({ kind: resolvedKind, items: getDirectoryOptionLists()[resolvedKind] })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load directory option list",
      detail: "Directory option storage is unavailable",
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
      return apiNotFound("Directory option list not found")
    }

    const body = await request.json()
    const payload = settingsOptionListSchema.parse(body)
    return apiSuccess(replaceDirectoryOptionList(resolvedKind, payload.items))
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid directory option payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update directory option list",
      detail: "Directory option update failed",
    })
  }
}
