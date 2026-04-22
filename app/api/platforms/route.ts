import { NextResponse } from "next/server"
import { platformCatalog } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: platformCatalog.map((platform) => ({
      id: platform.id,
      name: platform.name,
      owner: platform.owner,
      status: platform.status,
      region: platform.region,
      actions: platform.actions,
    })),
    total: platformCatalog.length,
  })
}
