import { NextResponse } from "next/server"
import { getSystemById } from "@/lib/identity-ops-data"

export async function GET(_: Request, { params }: { params: Promise<{ system: string }> }) {
  const { system } = await params
  const item = getSystemById(system)

  if (!item) {
    return NextResponse.json({ error: "System not found" }, { status: 404 })
  }

  return NextResponse.json(item)
}
