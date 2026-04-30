import { ZodError } from "zod"
import { z } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { formatZodError } from "@/lib/settings-validation"
import { authUserPermissions, updateAuthUserPermissions } from "@/lib/settings-store"

export const runtime = "nodejs"

const patchPermissionsSchema = z.object({
  permissions: z.array(z.enum(authUserPermissions)).default([]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subject: string }> },
) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { subject } = await params
    const body = await request.json().catch(() => null)
    const parsed = patchPermissionsSchema.safeParse(body ?? {})

    if (!parsed.success) {
      return apiValidationError({
        error: "Invalid permissions payload",
        issues: formatZodError(parsed.error),
      })
    }

    const updated = updateAuthUserPermissions(subject, parsed.data.permissions)

    if (!updated) {
      return apiNotFound("User not found")
    }

    return apiSuccess(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid permissions payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update user permissions",
      detail: "Failed to update user permissions",
    })
  }
}
