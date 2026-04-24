import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { getDirectoryOptionLists, replaceDirectoryOptionList, type DirectoryOptionKind } from "@/lib/settings-store"
import { directoryOptionKindSchema, formatZodError, settingsOptionListSchema } from "@/lib/settings-validation"

export const runtime = "nodejs"

function resolveKind(value: string): DirectoryOptionKind | null {
  const parsed = directoryOptionKindSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const { kind } = await params
    const resolvedKind = resolveKind(kind)

    if (!resolvedKind) {
      return NextResponse.json({ error: "Directory option list not found" }, { status: 404 })
    }

    return NextResponse.json({
      kind: resolvedKind,
      items: getDirectoryOptionLists()[resolvedKind],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load directory option list",
        detail: getErrorDetail(error, "Directory option storage is unavailable"),
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
      return NextResponse.json({ error: "Directory option list not found" }, { status: 404 })
    }

    const body = await request.json()
    const payload = settingsOptionListSchema.parse(body)

    return NextResponse.json(replaceDirectoryOptionList(resolvedKind, payload.items))
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid directory option payload",
          details: formatZodError(error),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update directory option list",
        detail: getErrorDetail(error, "Directory option update failed"),
      },
      { status: 500 },
    )
  }
}
