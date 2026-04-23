import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { getErrorDetail } from "@/lib/error-utils"
import { createOpenVpnAdminClient, OpenVpnApiError } from "@/lib/openvpn-admin"
import { loadOpenVpnSubjectDetail } from "@/lib/openvpn-directory"
import { appendAuditLog } from "@/lib/settings-store"
import {
  compactObject,
  formatOpenVpnZodError,
  openVpnGroupPatchSchema,
} from "@/lib/openvpn-mutations"

export const runtime = "nodejs"

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params
    const decodedName = decodeURIComponent(name)
    const client = await createOpenVpnAdminClient()
    const detail = await loadOpenVpnSubjectDetail(client, "group", decodedName)

    if (!detail) {
      return NextResponse.json({ error: "OpenVPN group not found" }, { status: 404 })
    }

    return NextResponse.json(detail)
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to load OpenVPN group",
        detail: getErrorDetail(error, "OpenVPN group detail is unavailable"),
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
    const payload = openVpnGroupPatchSchema.parse({
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
      action: "openvpn.group.updated",
      resourceType: "openvpn-group",
      resourceId: decodedName,
      resourceName: decodedName,
      detail: `Updated OpenVPN group ${decodedName}`,
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Invalid OpenVPN group payload",
          issues: formatOpenVpnZodError(error),
        },
        { status: 422 },
      )
    }

    return NextResponse.json(
      {
        error: "Unable to update OpenVPN group",
        detail: getErrorDetail(error, "OpenVPN group update failed"),
      },
      { status: error instanceof OpenVpnApiError ? error.status : 500 },
    )
  }
}
