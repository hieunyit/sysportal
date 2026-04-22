import { NextResponse } from "next/server"
import { apiCatalog } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: apiCatalog,
    total: apiCatalog.length,
  })
}
