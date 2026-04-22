import { NextResponse } from "next/server"
import { getPlatformById } from "@/lib/identity-ops-data"

export async function GET(_: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params
  const item = getPlatformById(platform)

  if (!item) {
    return NextResponse.json({ error: "Platform not found" }, { status: 404 })
  }

  return NextResponse.json(item)
}
