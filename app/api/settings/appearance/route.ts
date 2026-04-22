import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { getAppearanceSettings, updateAppearanceSettings } from "@/lib/settings-store"
import { appearanceSettingsSchema, formatZodError } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json(getAppearanceSettings())
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load appearance settings",
        detail: getErrorDetail(error, "Appearance settings storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const payload = appearanceSettingsSchema.parse(body)

    return NextResponse.json(updateAppearanceSettings(payload))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid appearance payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update appearance settings",
        detail: getErrorDetail(error, "Appearance settings update failed"),
      },
      { status: 500 },
    )
  }
}
