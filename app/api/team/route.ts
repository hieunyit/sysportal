import { NextResponse } from "next/server"
import { teamMembers } from "@/lib/identity-ops-data"

export async function GET() {
  return NextResponse.json({
    items: teamMembers,
    total: teamMembers.length,
  })
}
