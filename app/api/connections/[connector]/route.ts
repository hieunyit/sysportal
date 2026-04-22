import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import {
  appendAuditLog,
  connectionKeys,
  getSystemConnection,
  type SystemConnectionKey,
  updateSystemConnection,
} from "@/lib/settings-store"
import { formatZodError, getConnectionSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function isSystemConnectionKey(value: string): value is SystemConnectionKey {
  return connectionKeys.includes(value as SystemConnectionKey)
}

export async function GET(_: Request, { params }: { params: Promise<{ connector: string }> }) {
  try {
    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const resource = getSystemConnection(connector)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "access",
      action: "connection.viewed",
      resourceType: "connection",
      resourceId: connector,
      resourceName: connector,
      detail: `Viewed ${connector} configuration`,
    })

    return NextResponse.json({
      id: connector,
      config: resource.config,
      updatedAt: resource.updatedAt,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load connection",
        detail: getErrorDetail(error, "Connection storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ connector: string }> }) {
  try {
    const { connector } = await params

    if (!isSystemConnectionKey(connector)) {
      return NextResponse.json({ error: "Connection not found" }, { status: 404 })
    }

    const body = await request.json()
    const payload = getConnectionSchema(connector).parse(body)
    const updated = updateSystemConnection(connector, payload)
    const resource = getSystemConnection(connector)

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "connection.updated",
      resourceType: "connection",
      resourceId: connector,
      resourceName: connector,
      detail: `Updated ${connector} connection settings`,
    })

    return NextResponse.json({
      id: connector,
      config: resource.config,
      updatedAt: updated.updatedAt,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid connection payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update connection",
        detail: getErrorDetail(error, "Connection update failed"),
      },
      { status: 500 },
    )
  }
}
