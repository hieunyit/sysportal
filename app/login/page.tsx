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
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Operations Console
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in with your Keycloak account to continue.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {errorMessage && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-5 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <div className="px-6 py-8 space-y-6">
            <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/70">Protected systems</p>
              <p>Keycloak · OpenVPN · Email templates · Audit log · Admin APIs</p>
            </div>

            <Link href={`/api/auth/login?next=${encodeURIComponent(nextPath)}`} className="block">
              <Button className="h-11 w-full rounded-xl text-sm font-semibold">
                Login with Keycloak
              </Button>
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground/60">
          Access is restricted to authorized operators.
        </p>
      </div>
    </main>
  )
}
