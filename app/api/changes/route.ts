import { NextResponse } from "next/server"
import { changeAgenda, changePolicies, changeWindows } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    windows: changeWindows,
    agenda: changeAgenda,
    policies: changePolicies,
  })
}
