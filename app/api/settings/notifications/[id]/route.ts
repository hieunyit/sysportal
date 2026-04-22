import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { getNotificationSetting, updateNotificationSetting } from "@/lib/settings-store"
import { formatZodError, notificationSettingPatchSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const item = getNotificationSetting(id)

    if (!item) {
      return NextResponse.json({ error: "Notification setting not found" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load notification setting",
        detail: getErrorDetail(error, "Notification settings storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const payload = notificationSettingPatchSchema.parse(body)
    const item = updateNotificationSetting(id, payload)

    if (!item) {
      return NextResponse.json({ error: "Notification setting not found" }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid notification patch payload", details: formatZodError(error) },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update notification setting",
        detail: getErrorDetail(error, "Notification setting update failed"),
      },
      { status: 500 },
    )
  }
}
