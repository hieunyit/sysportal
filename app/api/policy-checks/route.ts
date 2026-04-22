import { NextResponse } from "next/server"
import { policyChecks } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: policyChecks,
    total: policyChecks.length,
  })
}
