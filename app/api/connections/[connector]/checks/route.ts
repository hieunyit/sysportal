import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { testConnectorConnection } from "@/lib/connection-tests"
import { getErrorDetail } from "@/lib/error-utils"
import { appendAuditLog, connectionKeys, type SystemConnectionKey } from "@/lib/settings-store"
import { formatZodError, getConnectionSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function isSystemConnectionKey(value: string): value is SystemConnectionKey {
  return connectionKeys.includes(value as SystemConnectionKey)
}

export async function POST(request: Request, { params }: { params: Promise<{ connector: string }> }) {
  try {
    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const body = await request.json()
    const payload = getConnectionSchema(connector).parse(body)
    const result = await testConnectorConnection(connector, payload)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "action",
      action: "connection.check.executed",
      resourceType: "connection",
      resourceId: connector,
      resourceName: connector,
      detail: `Executed live connection check for ${connector} (${result.ok ? "passed" : "failed"})`,
      metadata: { ok: result.ok },
    })

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
