import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { listNotificationSettings, replaceNotificationSettings } from "@/lib/settings-store"
import { formatZodError, notificationSettingsSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    const items = listNotificationSettings()

    return NextResponse.json({
      items,
      total: items.length,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load notification settings",
        detail: getErrorDetail(error, "Notification settings storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const payload = notificationSettingsSchema.parse(body)
    const items = replaceNotificationSettings(payload.items)

    return NextResponse.json({
      items,
      total: items.length,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid notification payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update notification settings",
        detail: getErrorDetail(error, "Notification settings update failed"),
      },
      { status: 500 },
    )
  }
}
