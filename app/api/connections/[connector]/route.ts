import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import {
  appendAuditLog,
  connectionKeys,
  getSystemConnection,
  preserveMaskedConnectionSecrets,
  sanitizeConnectionConfig,
  type SystemConnectionKey,
  updateSystemConnection,
} from "@/lib/settings-store"
import { formatZodError, getConnectionSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function isSystemConnectionKey(value: string): value is SystemConnectionKey {
  return connectionKeys.includes(value as SystemConnectionKey)
}

export async function GET(request: Request, { params }: { params: Promise<{ connector: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return apiNotFound("Connection not found", `Connector "${connector}" is not configured.`)
    }

    const resource = getSystemConnection(connector)

    return apiSuccess({
      id: connector,
      config: sanitizeConnectionConfig(connector, resource.config),
      updatedAt: resource.updatedAt,
    })
  } catch (error) {
    return apiErrorResponse(error, {
      error: "Unable to load connection",
      detail: "Connection storage is unavailable",
    })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ connector: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return apiNotFound("Connection not found", `Connector "${connector}" is not configured.`)
    }

    const body = await request.json()
    const payload = getConnectionSchema(connector).parse(body)
    const currentResource = getSystemConnection(connector)
    const nextPayload = preserveMaskedConnectionSecrets(connector, payload, currentResource.config)
    const updated = updateSystemConnection(connector, nextPayload)
    const resource = getSystemConnection(connector)

    appendAuditLog({
      actorName: auth.actorName,
      category: "edit",
      action: "connection.updated",
      resourceType: "connection",
      resourceId: connector,
      resourceName: connector,
      detail: `Updated ${connector} connection settings`,
    })

    return apiSuccess({
      id: connector,
      config: sanitizeConnectionConfig(connector, resource.config),
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid connection payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to update connection",
      detail: "Connection update failed",
    })
  }
}
