import { NextResponse } from "next/server"
import { getSessionFromRequest } from "@/lib/auth/session"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      sub: session.sub,
      name: session.name,
      email: session.email,
      preferredUsername: session.preferredUsername,
      roles: session.roles,
    },
  })
}
