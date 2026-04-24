import { NextResponse } from "next/server"
import { getErrorDetail } from "@/lib/error-utils"
import { getDirectoryOptionLists } from "@/lib/settings-store"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json({
      items: getDirectoryOptionLists(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load directory option lists",
        detail: getErrorDetail(error, "Directory option storage is unavailable"),
      },
      { status: 500 },
    )
  }
}
