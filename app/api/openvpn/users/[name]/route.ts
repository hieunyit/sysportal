import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { loadOpenVpnSubjectDetail } from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  compactObject,
  formatOpenVpnZodError,
  openVpnUserPatchSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const client = await createOpenVpnAdminClient()
    const detail = await loadOpenVpnSubjectDetail(client, "user", decodedName)

    if (!detail) {
      return NextResponse.json({ error: "OpenVPN user not found" }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load OpenVPN user",
        detail: getErrorDetail(error, "OpenVPN user detail is unavailable"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const body = await request.json()
    const payload = openVpnUserPatchSchema.parse({
      ...body,
      name: decodedName,
    })
    const client = await createOpenVpnAdminClient()

    await client.setUserProps([
      compactObject(payload),
    ])

    appendAuditLog({
      actorName: "Identity Admin",
      category: "edit",
      action: "openvpn.user.updated",
      resourceType: "openvpn-user",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Updated OpenVPN user ${decodedName}`,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN user payload",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update OpenVPN user",
        detail: getErrorDetail(error, "OpenVPN user update failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
