export const AUTH_SESSION_COOKIE_NAME = "identityops_session"
export const AUTH_STATE_COOKIE_NAME = "identityops_auth_state"
export const AUTH_SESSION_DURATION_SECONDS = 8 * 60 * 60
export const AUTH_STATE_DURATION_SECONDS = 10 * 60

const DEFAULT_AUTH_SECRET = "identityops-local-dev-secret-change-me"

export interface IdentityOpsSessionPayload {
  sub: string
  name: string
  email: string
  preferredUsername: string
  roles: string[]
  idToken?: string
  iat: number
  exp: number
}

interface AuthStatePayload {
  purpose: "auth-state"
  state: string
  nextPath: string
  iat: number
  exp: number
}

type JwtPayload = { iat: number; exp: number }

function getAuthSecret() {
  return (
    process.env.IDENTITYOPS_AUTH_SECRET?.trim() ||
    process.env.AUTH_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    DEFAULT_AUTH_SECRET
  )
}

function encodeBase64UrlFromBytes(value: Uint8Array) {
  const binaryValue = Array.from(value, (item) => String.fromCharCode(item)).join("")
  return btoa(binaryValue).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function decodeBase64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4))
  const binaryValue = atob(`${normalized}${padding}`)
  return Uint8Array.from(binaryValue, (character) => character.charCodeAt(0))
}

function encodeJson(value: unknown) {
  return encodeBase64UrlFromBytes(new TextEncoder().encode(JSON.stringify(value)))
}

function decodeJson<T>(value: string) {
  return JSON.parse(new TextDecoder().decode(decodeBase64UrlToBytes(value))) as T
}

async function importSigningKey() {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getAuthSecret()),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign", "verify"],
  )
}

async function signValue(value: string) {
  const key = await importSigningKey()
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return encodeBase64UrlFromBytes(new Uint8Array(signature))
}

async function verifyValue(value: string, signature: string) {
  const key = await importSigningKey()
  const buffer = decodeBase64UrlToBytes(signature)
  return crypto.subtle.verify("HMAC", key, buffer, new TextEncoder().encode(value))
}

async function signJwt<TPayload extends JwtPayload>(payload: TPayload) {
  const encodedHeader = encodeJson({ alg: "HS256", typ: "JWT" })
  const encodedPayload = encodeJson(payload)
  const unsignedToken = `${encodedHeader}.${encodedPayload}`
  const signature = await signValue(unsignedToken)
  return `${unsignedToken}.${signature}`
}

async function verifyJwt<TPayload extends JwtPayload>(token: string) {
  const parts = token.split(".")

  if (parts.length !== 3) {
    return null
  }

  const [encodedHeader, encodedPayload, signature] = parts
  const header = decodeJson<{ alg?: string; typ?: string }>(encodedHeader)

  if (header.alg !== "HS256" || header.typ !== "JWT") {
    return null
  }

  const verified = await verifyValue(`${encodedHeader}.${encodedPayload}`, signature)

  if (!verified) {
    return null
  }

  const payload = decodeJson<TPayload>(encodedPayload)

  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null
  }

  return payload
}

export function normalizeNextPath(value?: string | null, fallback = "/") {
  const trimmedValue = value?.trim()

  if (!trimmedValue) {
    return fallback
  }

  if (!trimmedValue.startsWith("/") || trimmedValue.startsWith("//")) {
    return fallback
  }

  return trimmedValue
}

export function parseJwtPayload<TPayload>(token?: string | null) {
  if (!token) {
    return null
  }

  const parts = token.split(".")

  if (parts.length < 2) {
    return null
  }

  try {
    return decodeJson<TPayload>(parts[1])
  } catch {
    return null
  }
}

export async function createIdentityOpsSessionToken(
  payload: Omit<IdentityOpsSessionPayload, "iat" | "exp">,
  durationSeconds = AUTH_SESSION_DURATION_SECONDS,
) {
  const issuedAt = Math.floor(Date.now() / 1000)

  return signJwt<IdentityOpsSessionPayload>({
    ...payload,
    iat: issuedAt,
    exp: issuedAt + durationSeconds,
  })
}

export async function verifyIdentityOpsSessionToken(token?: string | null) {
  if (!token) {
    return null
  }

  const payload = await verifyJwt<IdentityOpsSessionPayload>(token)

  if (!payload?.sub) {
    return null
  }

  return payload
}

export async function createAuthStateToken(state: string, nextPath: string) {
  const issuedAt = Math.floor(Date.now() / 1000)

  return signJwt<AuthStatePayload>({
    purpose: "auth-state",
    state,
    nextPath: normalizeNextPath(nextPath),
    iat: issuedAt,
    exp: issuedAt + AUTH_STATE_DURATION_SECONDS,
  })
}

export async function verifyAuthStateToken(token?: string | null) {
  if (!token) {
    return null
  }

  const payload = await verifyJwt<AuthStatePayload>(token)

  if (!payload || payload.purpose !== "auth-state") {
    return null
  }

  return payload
}

export function getCookieValue(cookieHeader: string | null, cookieName: string) {
  if (!cookieHeader) {
    return null
  }

  const matches = cookieHeader.split(";").map((item) => item.trim())
  const match = matches.find((item) => item.startsWith(`${cookieName}=`))

  if (!match) {
    return null
  }

  return decodeURIComponent(match.slice(cookieName.length + 1))
}

export async function getSessionFromRequest(request: Request) {
  const cookieToken = getCookieValue(request.headers.get("cookie"), AUTH_SESSION_COOKIE_NAME)
  return verifyIdentityOpsSessionToken(cookieToken)
}

export function getSessionCookieOptions(maxAge = AUTH_SESSION_DURATION_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  }
}

export function getExpiredCookieOptions() {
  return {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  }
}
