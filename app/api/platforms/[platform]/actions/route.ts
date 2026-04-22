import { NextResponse } from "next/server"
import { getPlatformById } from "@/lib/identity-ops-data"

export async function POST(request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params
  const item = getPlatformById(platform)

  if (!item) {
    return NextResponse.json({ error: "Platform not found" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as { action?: string }
  const action = body.action ?? item.actions[0]

  return NextResponse.json({
    platform: item.id,
    action,
    status: "accepted",
    executedAt: new Date().toISOString(),
  })
}
