import { ZodError } from "zod"
import { isApiAuthResponse, requireAdminApiSession } from "@/lib/auth/api"
import { apiErrorResponse, apiNotFound, apiSuccess, apiValidationError } from "@/lib/api-response"
import { testConnectorConnection } from "@/lib/connection-tests"
import {
  connectionKeys,
  getSystemConnection,
  preserveMaskedConnectionSecrets,
  type SystemConnectionKey,
} from "@/lib/settings-store"
import { formatZodError, getConnectionSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function isSystemConnectionKey(value: string): value is SystemConnectionKey {
  return connectionKeys.includes(value as SystemConnectionKey)
}

function hasProvidedCheckPayload(value: unknown) {
  return Boolean(value && typeof value === "object" && Object.keys(value).length > 0)
}

export async function POST(request: Request, { params }: { params: Promise<{ connector: string }> }) {
  try {
    const auth = await requireAdminApiSession(request)

    if (isApiAuthResponse(auth)) {
      return auth
    }

    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return apiNotFound("Connection not found", `Connector "${connector}" is not configured.`)
    }

    const rawBody = await request.text()
    const parsedBody = rawBody.trim() ? (JSON.parse(rawBody) as unknown) : null
    const currentConfig = getSystemConnection(connector).config
    const payloadSource = hasProvidedCheckPayload(parsedBody) ? parsedBody : currentConfig
    const parsedPayload = getConnectionSchema(connector).parse(payloadSource)
    const payload = preserveMaskedConnectionSecrets(connector, parsedPayload, currentConfig)
    const result = await testConnectorConnection(connector, payload)

    return apiSuccess(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return apiValidationError({
        error: "Invalid connection check payload",
        issues: formatZodError(error),
      })
    }

    return apiErrorResponse(error, {
      error: "Unable to run connection check",
      detail: "Connection check failed",
    })
  }
}
