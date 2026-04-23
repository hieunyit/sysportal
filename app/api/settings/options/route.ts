import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { getSettingsOptionLists } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json({
      items: getSettingsOptionLists(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load option lists",
        detail: getErrorDetail(error, "Settings option storage is unavailable"),
      },
      { status: 500 },
    )
  }
}
