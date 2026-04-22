import { NextResponse } from "next/server"
import { alertFeed } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: alertFeed,
    total: alertFeed.length,
  })
}
