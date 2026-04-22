import { NextResponse } from "next/server"
import { getRequestById } from "@/lib/identity-ops-data"

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = getRequestById(id)

  if (!item) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 })
  }

  return NextResponse.json({
    ...item,
    status: "Approved",
    approvedAt: new Date().toISOString(),
  })
}
