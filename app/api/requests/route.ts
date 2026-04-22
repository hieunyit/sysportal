import { NextResponse } from "next/server"
import { accessRequests, approvalQueue } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: accessRequests,
    queue: approvalQueue,
    total: accessRequests.length,
  })
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, string>
  const created = {
    id: `req-${Date.now()}`,
    title: body.title ?? "New access request",
    requester: body.requester ?? "Unknown requester",
    system: body.system ?? "Keycloak",
    status: "Pending approval",
    dueDate: body.dueDate ?? new Date().toISOString(),
    tag: body.tag ?? "General",
  }

  return NextResponse.json(created, { status: 201 })
}
