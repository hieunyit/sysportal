import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { getProfileSettingsBundle, updateProfileSettings } from "@/lib/settings-store"
import { formatZodError, profileSettingsSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json(getProfileSettingsBundle())
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load profile settings",
        detail: getErrorDetail(error, "Profile settings storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const payload = profileSettingsSchema.parse(body)

    return NextResponse.json(updateProfileSettings(payload))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid profile payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update profile settings",
        detail: getErrorDetail(error, "Profile settings update failed"),
      },
      { status: 500 },
    )
  }
}
