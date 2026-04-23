import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { testConnectorConnection } from "@/lib/connection-tests"
import { getErrorDetail } from "@/lib/error-utils"
import {
  connectionKeys,
  getSystemConnection,
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
    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const rawBody = await request.text()
    const parsedBody = rawBody.trim() ? (JSON.parse(rawBody) as unknown) : null
    const payloadSource = hasProvidedCheckPayload(parsedBody)
      ? parsedBody
      : getSystemConnection(connector).config
    const payload = getConnectionSchema(connector).parse(payloadSource)
    const result = await testConnectorConnection(connector, payload)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid connection check payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to run connection check",
        detail: getErrorDetail(error, "Connection check failed"),
      },
      { status: 500 },
    )
  }
}
