import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { getSettingsBundle } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json(getSettingsBundle())
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load settings bundle",
        detail: getErrorDetail(error, "Settings storage is unavailable"),
      },
      { status: 500 },
    )
  }
}
