import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { getSettingsOptionLists, replaceSettingsOptionList, type SettingsOptionKind } from "@/lib/settings-store"
import { formatZodError, settingsOptionKindSchema, settingsOptionListSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function resolveKind(value: string): SettingsOptionKind | null {
  const parsed = settingsOptionKindSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await params
    const resolvedKind = resolveKind(kind)

    if (!resolvedKind) {
      return NextResponse.json({ error: "Option list not found" }, { status: 404 })
    }

    return NextResponse.json({
      kind: resolvedKind,
      items: getSettingsOptionLists()[resolvedKind],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load option list",
        detail: getErrorDetail(error, "Settings option storage is unavailable"),
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await params
    const resolvedKind = resolveKind(kind)

    if (!resolvedKind) {
      return NextResponse.json({ error: "Option list not found" }, { status: 404 })
    }

    const body = await request.json()
    const payload = settingsOptionListSchema.parse(body)

    return NextResponse.json(replaceSettingsOptionList(resolvedKind, payload.items))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid option list payload",
          details: formatZodError(error),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update option list",
        detail: getErrorDetail(error, "Settings option list update failed"),
      },
      { status: 500 },
    )
  }
}
