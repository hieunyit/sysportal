import Link from "next/link"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { normalizeNextPath } from "@/lib/auth/session"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const nextPath = normalizeNextPath(resolvedSearchParams.next)
  const errorMessage = resolvedSearchParams.error?.trim() || ""

  return (
    <main className="min-h-screen bg-[#f5f5f4] px-4 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
        <div className="w-full max-w-md border border-slate-200 bg-white px-10 py-14 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-slate-200">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="mt-8 space-y-3">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950">Login with Keycloak</h1>
            <p className="text-base text-slate-600">
              Sign in before accessing IdentityOps.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <Link href={`/api/auth/login?next=${encodeURIComponent(nextPath)}`} className="mt-10 block">
            <Button className="h-12 w-full rounded-none bg-black text-sm font-semibold text-white hover:bg-black/90">
              Login with Keycloak
            </Button>
          </Link>

          <div className="mt-10 border-t border-slate-200 pt-5 text-sm text-slate-500">
            Protected access for Keycloak, OpenVPN, templates, and admin APIs.
          </div>
        </div>
      </div>
    </main>
  )
}
