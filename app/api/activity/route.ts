import { NextResponse } from "next/server"
import { activityItems } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: activityItems,
    total: activityItems.length,
  })
}
