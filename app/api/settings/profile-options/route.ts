import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { getProfileOptionLists } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json({
      items: getProfileOptionLists(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load profile option lists",
        detail: getErrorDetail(error, "Profile option storage is unavailable"),
      },
      { status: 500 },
    )
  }
}
