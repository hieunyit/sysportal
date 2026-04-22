import { NextResponse } from "next/server"
import { systems } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: systems,
    total: systems.length,
  })
}
