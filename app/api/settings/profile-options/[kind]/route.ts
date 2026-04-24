import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { getProfileOptionLists, replaceProfileOptionList, type ProfileOptionKind } from "@/lib/settings-store"
import { formatZodError, profileOptionKindSchema, settingsOptionListSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function resolveKind(value: string): ProfileOptionKind | null {
  const parsed = profileOptionKindSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await params
    const resolvedKind = resolveKind(kind)

    if (!resolvedKind) {
      return NextResponse.json({ error: "Profile option list not found" }, { status: 404 })
    }

    return NextResponse.json({
      kind: resolvedKind,
      items: getProfileOptionLists()[resolvedKind],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load profile option list",
        detail: getErrorDetail(error, "Profile option storage is unavailable"),
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
      return NextResponse.json({ error: "Profile option list not found" }, { status: 404 })
    }

    const body = await request.json()
    const payload = settingsOptionListSchema.parse(body)

    return NextResponse.json(replaceProfileOptionList(resolvedKind, payload.items))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid profile option payload",
          details: formatZodError(error),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update profile option list",
        detail: getErrorDetail(error, "Profile option update failed"),
      },
      { status: 500 },
    )
  }
}
