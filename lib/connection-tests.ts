import { request as httpRequest, type IncomingHttpHeaders } from "node:http"
import { request as httpsRequest } from "node:https"
import { Socket, connect as connectTcp } from "node:net"
import { TLSSocket, connect as connectTls } from "node:tls"
import type {
  KeycloakConnectionRecord,
  OpenVpnConnectionRecord,
  SmtpSettingsRecord,
  SystemConnectionKey,
} from "@/lib/settings-store"

export interface ConnectionTestResult {
  ok: boolean
  connector: SystemConnectionKey
  message: string
  checkedAt: string
  details: string[]
}

interface HttpResponsePayload<T = unknown> {
  statusCode: number
  headers: IncomingHttpHeaders
  text: string
  json: T | null
}

interface HttpRequestOptions {
  method: "GET" | "POST"
  url: string
  timeoutMs: number
  rejectUnauthorized: boolean
  headers?: Record<string, string>
  body?: string
}

interface SmtpResponse {
  code: number
  lines: string[]
  message: string
}

function trimTrailingSlash(value: string) {
  return value.trim().replace(/\/+$/, "")
}

function normalizeApiBasePath(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return "/api"
  }

  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return normalized.replace(/\/+$/, "") || "/api"
}

function isPlaceholderHost(host: string) {
  const normalized = host.trim().toLowerCase()

  return normalized === "smtp.example.com" || normalized.endsWith(".example.com")
}

function isAliyunDirectMailHost(host: string) {
  const normalized = host.trim().toLowerCase()

  return (
    normalized === "smtpdm.aliyun.com" ||
    normalized === "smtpdm-ap-southeast-1.aliyun.com" ||
    normalized === "smtpdm-ap-southeast-1.aliyuncs.com" ||
    normalized === "smtpdm-us-east-1.aliyuncs.com" ||
    normalized === "smtpdm-eu-central-1.aliyuncs.com"
  )
}

function formatSmtpTlsModeLabel(mode: SmtpSettingsRecord["tlsMode"]) {
  switch (mode) {
    case "direct":
      return "Direct TLS"
    case "starttls":
      return "STARTTLS"
    case "none":
      return "Plain SMTP"
  }
}

function describeConnectionError(error: unknown) {
  if (!(error instanceof Error)) {
    return "Unknown connection error"
  }

  const code =
    typeof (error as NodeJS.ErrnoException).code === "string"
      ? (error as NodeJS.ErrnoException).code
      : null

  return code ? `${code}: ${error.message}` : error.message
}

function buildAliyunDirectMailHints(config: SmtpSettingsRecord, error: unknown) {
  const errorText = describeConnectionError(error)
  const hints = [
    "Aliyun Direct Mail expects the SMTP username to be the full sender address.",
    "Aliyun Direct Mail requires the SMTP password or authorization code from the Direct Mail console, not the mailbox sign-in password.",
    "The sender address must already be created and verified in the Aliyun Direct Mail console.",
    "If this account belongs to Alibaba Mail instead of Direct Mail, use the Alibaba Mail SMTP service such as smtp.qiye.aliyun.com rather than smtpdm.",
  ]

  if (config.username.trim() !== config.fromAddress.trim()) {
    hints.unshift("Current configuration mismatch: SMTP username should match the configured From address for Aliyun Direct Mail.")
  }

  if (config.host.trim().toLowerCase() === "smtpdm-ap-southeast-1.aliyun.com") {
    hints.push("The current host is the legacy Singapore endpoint. Current Aliyun docs recommend smtpdm-ap-southeast-1.aliyuncs.com.")
  }

  if (config.tlsMode !== "direct" || config.port !== 465) {
    hints.push("Aliyun Direct Mail generally works best with Direct TLS on port 465.")
  }

  if (errorText.includes("@ud010201") || /authentication failure/i.test(errorText)) {
    hints.unshift("The server rejected the credentials after the TLS handshake, so this is an authentication/configuration problem rather than a network problem.")
  }

  return hints
}

function buildResult(
  connector: SystemConnectionKey,
  ok: boolean,
  message: string,
  details: string[],
) {
  return {
    ok,
    connector,
    message,
    checkedAt: new Date().toISOString(),
    details,
  } satisfies ConnectionTestResult
}

function summarizePayload(value: unknown) {
  if (typeof value === "string") {
    return value
  }

  if (!value || typeof value !== "object") {
    return ""
  }

  const entries = Object.entries(value as Record<string, unknown>)
  const priorityKeys = [
    "error_description",
    "error",
    "detail",
    "message",
    "reason",
    "username",
    "expires_after",
  ]

  for (const key of priorityKeys) {
    const match = entries.find(([entryKey, entryValue]) => entryKey === key && typeof entryValue === "string")

    if (match) {
      return `${match[0]}=${match[1]}`
    }
  }

  return entries
    .filter(([, entryValue]) => ["string", "number", "boolean"].includes(typeof entryValue))
    .slice(0, 3)
    .map(([key, entryValue]) => `${key}=${String(entryValue)}`)
    .join(", ")
}

function requestJson<T = unknown>({
  method,
  url,
  timeoutMs,
  rejectUnauthorized,
  headers,
  body,
}: HttpRequestOptions) {
  return new Promise<HttpResponsePayload<T>>((resolve, reject) => {
    const target = new URL(url)
    const isHttps = target.protocol === "https:"
    const requestImpl = isHttps ? httpsRequest : httpRequest
    const requestHeaders = {
      Accept: "application/json",
      ...(headers ?? {}),
    } as Record<string, string>

    if (body !== undefined && !requestHeaders["Content-Length"]) {
      requestHeaders["Content-Length"] = String(Buffer.byteLength(body))
    }

    const request = requestImpl(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port ? Number(target.port) : undefined,
        path: `${target.pathname}${target.search}`,
        method,
        headers: requestHeaders,
        rejectUnauthorized,
      },
      (response) => {
        const chunks: Buffer[] = []

        response.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        })

        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8")
          let json: T | null = null

          if (text) {
            try {
              json = JSON.parse(text) as T
            } catch {
              json = null
            }
          }

          resolve({
            statusCode: response.statusCode ?? 0,
            headers: response.headers,
            text,
            json,
          })
        })
      },
    )

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Request timed out after ${timeoutMs}ms`))
    })

    request.on("error", reject)

    if (body !== undefined) {
      request.write(body)
    }

    request.end()
  })
}

function createSocketReader(socket: Socket | TLSSocket, timeoutMs: number) {
  let buffer = ""
  const queue: string[] = []
  const waiters: Array<{ resolve: (line: string) => void; reject: (error: Error) => void }> = []
  let terminalError: Error | null = null

  function flushQueue() {
    while (queue.length > 0 && waiters.length > 0) {
      waiters.shift()?.resolve(queue.shift()!)
    }
  }

  function failWaiters(error: Error) {
    terminalError = error

    while (waiters.length > 0) {
      waiters.shift()?.reject(error)
    }
  }

  const onData = (chunk: Buffer | string) => {
    buffer += chunk.toString()

    while (true) {
      const lineBreak = buffer.indexOf("\n")

      if (lineBreak === -1) {
        break
      }

      queue.push(buffer.slice(0, lineBreak + 1))
      buffer = buffer.slice(lineBreak + 1)
    }

    flushQueue()
  }

  const onError = (error: Error) => {
    failWaiters(error)
  }

  const onClose = () => {
    failWaiters(terminalError ?? new Error("Connection closed unexpectedly"))
  }

  socket.setEncoding("utf8")
  socket.on("data", onData)
  socket.once("error", onError)
  socket.once("close", onClose)

  async function nextLine() {
    if (queue.length > 0) {
      return queue.shift()!
    }

    if (terminalError) {
      throw terminalError
    }

    return new Promise<string>((resolve, reject) => {
      let waiter:
        | {
            resolve: (line: string) => void
            reject: (error: Error) => void
          }
        | undefined
      const timer = setTimeout(() => {
        const error = new Error(`Timed out waiting for server response after ${timeoutMs}ms`)
        const waiterIndex = waiters.indexOf(waiter!)

        if (waiterIndex >= 0) {
          waiters.splice(waiterIndex, 1)
        }

        reject(error)
      }, timeoutMs)

      waiter = {
        resolve: (line) => {
          clearTimeout(timer)
          resolve(line)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      }

      waiters.push(waiter)
    })
  }

  async function readResponse() {
    const lines: string[] = []

    while (true) {
      const next = (await nextLine()).replace(/\r?\n$/, "")
      lines.push(next)

      if (/^\d{3} /.test(next)) {
        const code = Number(next.slice(0, 3))

        return {
          code,
          lines,
          message: lines.map((line) => (line.length > 4 ? line.slice(4) : line)).join(" | "),
        } satisfies SmtpResponse
      }
    }
  }

  function cleanup() {
    socket.off("data", onData)
    socket.off("error", onError)
    socket.off("close", onClose)
  }

  return {
    readResponse,
    cleanup,
  }
}

function writeCommand(socket: Socket | TLSSocket, command: string) {
  return new Promise<void>((resolve, reject) => {
    socket.write(`${command}\r\n`, (error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

function parseAuthMechanisms(response: SmtpResponse) {
  const mechanisms = new Set<string>()

  response.lines.forEach((line) => {
    const normalized = line.length > 4 ? line.slice(4).trim() : line.trim()
    const match = normalized.match(/^AUTH\s+(.+)$/i)

    if (!match) {
      return
    }

    match[1]
      .trim()
      .split(/\s+/)
      .forEach((mechanism) => {
        mechanisms.add(mechanism.toUpperCase())
      })
  })

  return mechanisms
}

async function connectPlainSocket(host: string, port: number, timeoutMs: number) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = connectTcp({ host, port })

    const timer = setTimeout(() => {
      socket.destroy(new Error(`Timed out connecting to ${host}:${port} after ${timeoutMs}ms`))
    }, timeoutMs)

    socket.once("connect", () => {
      clearTimeout(timer)
      resolve(socket)
    })

    socket.once("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function connectTlsSocket(
  options:
    | {
        host: string
        port: number
        timeoutMs: number
        rejectUnauthorized: boolean
      }
    | {
        socket: Socket
        host: string
        timeoutMs: number
        rejectUnauthorized: boolean
      },
) {
  return new Promise<TLSSocket>((resolve, reject) => {
    const socket = "socket" in options
      ? connectTls({
          socket: options.socket,
          servername: options.host,
          rejectUnauthorized: options.rejectUnauthorized,
        })
      : connectTls({
          host: options.host,
          port: options.port,
          servername: options.host,
          rejectUnauthorized: options.rejectUnauthorized,
        })

    const timer = setTimeout(() => {
      socket.destroy(new Error(`Timed out establishing TLS with ${options.host} after ${options.timeoutMs}ms`))
    }, options.timeoutMs)

    socket.once("secureConnect", () => {
      clearTimeout(timer)
      resolve(socket)
    })

    socket.once("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
  })
}

async function testSmtpAuth(
  socket: Socket | TLSSocket,
  reader: ReturnType<typeof createSocketReader>,
  capabilities: SmtpResponse,
  username: string,
  password: string,
) {
  const authMechanisms = parseAuthMechanisms(capabilities)

  if (authMechanisms.has("PLAIN")) {
    const encoded = Buffer.from(`\u0000${username}\u0000${password}`).toString("base64")
    await writeCommand(socket, `AUTH PLAIN ${encoded}`)
    const response = await reader.readResponse()

    if (response.code !== 235) {
      throw new Error(`SMTP authentication failed: ${response.message}`)
    }

    return {
      capabilities,
      authMethod: "PLAIN",
    }
  }

  if (authMechanisms.has("LOGIN")) {
    await writeCommand(socket, "AUTH LOGIN")
    const challengeUser = await reader.readResponse()

    if (challengeUser.code !== 334) {
      throw new Error(`SMTP authentication challenge failed: ${challengeUser.message}`)
    }

    await writeCommand(socket, Buffer.from(username).toString("base64"))
    const challengePassword = await reader.readResponse()

    if (challengePassword.code !== 334) {
      throw new Error(`SMTP username was rejected: ${challengePassword.message}`)
    }

    await writeCommand(socket, Buffer.from(password).toString("base64"))
    const response = await reader.readResponse()

    if (response.code !== 235) {
      throw new Error(`SMTP authentication failed: ${response.message}`)
    }

    return {
      capabilities,
      authMethod: "LOGIN",
    }
  }

  throw new Error("SMTP server does not advertise AUTH PLAIN or AUTH LOGIN")
}

interface OpenSmtpSessionResult {
  socket: Socket | TLSSocket
  reader: ReturnType<typeof createSocketReader>
  capabilities: SmtpResponse
  authMethod: string
  transportDescription: string
}

function writeRaw(socket: Socket | TLSSocket, value: string) {
  return new Promise<void>((resolve, reject) => {
    socket.write(value, "utf8", (error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}

function encodeMimeWord(value: string) {
  if (!value.trim()) {
    return ""
  }

  return /^[\x20-\x7E]+$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`
}

function formatMailboxHeader(address: string, displayName?: string) {
  const trimmedAddress = address.trim()
  const trimmedDisplayName = displayName?.trim() ?? ""

  if (!trimmedDisplayName) {
    return `<${trimmedAddress}>`
  }

  return `${encodeMimeWord(trimmedDisplayName)} <${trimmedAddress}>`
}

function normalizeSmtpBody(value: string) {
  return value
    .replace(/\r?\n/g, "\r\n")
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n")
}

async function closeSmtpSession(
  socket: Socket | TLSSocket | null,
  reader: ReturnType<typeof createSocketReader> | null,
) {
  if (!socket || !reader) {
    return
  }

  try {
    await writeCommand(socket, "QUIT")
    await reader.readResponse().catch(() => null)
  } finally {
    reader.cleanup()
    socket.destroy()
  }
}

async function openSmtpSession(config: SmtpSettingsRecord, timeoutMs: number): Promise<OpenSmtpSessionResult> {
  const rejectUnauthorized = !config.insecureSkipVerify
  let socket: Socket | TLSSocket =
    config.tlsMode === "direct"
      ? await connectTlsSocket({
          host: config.host,
          port: config.port,
          timeoutMs,
          rejectUnauthorized,
        })
      : await connectPlainSocket(config.host, config.port, timeoutMs)

  let reader = createSocketReader(socket, timeoutMs)
  const greeting = await reader.readResponse()

  if (greeting.code !== 220) {
    throw new Error(`SMTP server greeting failed: ${greeting.message}`)
  }

  await writeCommand(socket, "EHLO identityops.local")
  let capabilities = await reader.readResponse()

  if (capabilities.code !== 250) {
    throw new Error(`SMTP EHLO failed: ${capabilities.message}`)
  }

  let transportDescription = formatSmtpTlsModeLabel(config.tlsMode)

  if (config.tlsMode === "starttls") {
    const advertisesStartTls = capabilities.lines.some((line) =>
      line.length > 4 ? line.slice(4).trim().toUpperCase() === "STARTTLS" : false,
    )

    if (!advertisesStartTls) {
      throw new Error("SMTP server does not advertise STARTTLS")
    }

    await writeCommand(socket, "STARTTLS")
    const startTlsResponse = await reader.readResponse()

    if (startTlsResponse.code !== 220) {
      throw new Error(`STARTTLS failed: ${startTlsResponse.message}`)
    }

    reader.cleanup()
    socket = await connectTlsSocket({
      socket: socket as Socket,
      host: config.host,
      timeoutMs,
      rejectUnauthorized,
    })
    reader = createSocketReader(socket, timeoutMs)

    await writeCommand(socket, "EHLO identityops.local")
    capabilities = await reader.readResponse()

    if (capabilities.code !== 250) {
      throw new Error(`SMTP EHLO after STARTTLS failed: ${capabilities.message}`)
    }

    transportDescription = formatSmtpTlsModeLabel("starttls")
  }

  let authMethod = "not requested"

  if (config.requireAuth) {
    if (!config.username.trim()) {
      throw new Error("SMTP username is required when authentication is enabled")
    }

    if (!config.password.trim()) {
      throw new Error("SMTP password is required when authentication is enabled")
    }

    const authResult = await testSmtpAuth(socket, reader, capabilities, config.username.trim(), config.password)
    authMethod = authResult.authMethod
    capabilities = authResult.capabilities
  }

  return {
    socket,
    reader,
    capabilities,
    authMethod,
    transportDescription,
  }
}

export async function testKeycloakConnection(config: KeycloakConnectionRecord) {
  const baseUrl = trimTrailingSlash(config.serverUrl)
  const realm = config.realm.trim()
  const discoveryUrl = `${baseUrl}/realms/${realm}/.well-known/openid-configuration`
  const timeoutMs = config.timeoutSeconds * 1000

  if (!config.clientSecret.trim()) {
    return buildResult("keycloak", false, "Client secret is required to test client_credentials login.", [
      `Discovery URL: ${discoveryUrl}`,
      `Client ID: ${config.clientId}`,
    ])
  }

  try {
    const discovery = await requestJson<{ token_endpoint?: string }>({
      method: "GET",
      url: discoveryUrl,
      timeoutMs,
      rejectUnauthorized: config.verifyTls,
    })

    if (discovery.statusCode < 200 || discovery.statusCode >= 300 || !discovery.json?.token_endpoint) {
      return buildResult(
        "keycloak",
        false,
        `OIDC discovery failed with HTTP ${discovery.statusCode}.`,
        [
          `Discovery URL: ${discoveryUrl}`,
          summarizePayload(discovery.json ?? discovery.text) || "No additional response details were returned.",
        ],
      )
    }

    const tokenBody = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString()

    const tokenResponse = await requestJson<{
      access_token?: string
      token_type?: string
      expires_in?: number
      error?: string
      error_description?: string
    }>({
      method: "POST",
      url: discovery.json.token_endpoint,
      timeoutMs,
      rejectUnauthorized: config.verifyTls,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: tokenBody,
    })

    if (tokenResponse.statusCode >= 200 && tokenResponse.statusCode < 300 && tokenResponse.json?.access_token) {
      return buildResult("keycloak", true, "Successfully obtained a Keycloak access token.", [
        `Realm: ${realm}`,
        `Token endpoint: ${discovery.json.token_endpoint}`,
        `Token type: ${tokenResponse.json.token_type ?? "unknown"}`,
        `Expires in: ${tokenResponse.json.expires_in ?? "unknown"} seconds`,
      ])
    }

    return buildResult(
      "keycloak",
      false,
      `Keycloak rejected the client credentials request with HTTP ${tokenResponse.statusCode}.`,
      [
        `Realm: ${realm}`,
        `Token endpoint: ${discovery.json.token_endpoint}`,
        summarizePayload(tokenResponse.json ?? tokenResponse.text) || "No additional response details were returned.",
      ],
    )
  } catch (error) {
    return buildResult("keycloak", false, "Unable to reach the Keycloak server.", [
      `Discovery URL: ${discoveryUrl}`,
      error instanceof Error ? error.message : "Unknown connection error",
    ])
  }
}

export async function testOpenVpnConnection(config: OpenVpnConnectionRecord) {
  const baseUrl = trimTrailingSlash(config.serverUrl)
  const apiBasePath = normalizeApiBasePath(config.apiBasePath)
  const loginUrl = `${baseUrl}${apiBasePath}/auth/login/userpassword`
  const timeoutMs = config.timeoutSeconds * 1000

  if (!config.password.trim()) {
    return buildResult("openvpn", false, "Admin password is required to request an OpenVPN auth token.", [
      `Login endpoint: ${loginUrl}`,
      `Username: ${config.username}`,
    ])
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (config.nodeName.trim()) {
      headers["X-OpenVPN-AS-Node"] = config.nodeName.trim()
    }

    const response = await requestJson<{
      auth_token?: string
      expires_after?: string
      renewable_until?: string
      username?: string
      reason?: string
    }>({
      method: "POST",
      url: loginUrl,
      timeoutMs,
      rejectUnauthorized: config.verifyTls,
      headers,
      body: JSON.stringify({
        username: config.username,
        password: config.password,
        request_admin: true,
      }),
    })

    if (response.statusCode >= 200 && response.statusCode < 300 && response.json?.auth_token) {
      return buildResult("openvpn", true, "Successfully authenticated as admin and received an auth token.", [
        `Login endpoint: ${loginUrl}`,
        `Authenticated user: ${response.json.username ?? config.username}`,
        `Token expires: ${response.json.expires_after ?? "unknown"}`,
        `Renewable until: ${response.json.renewable_until ?? "unknown"}`,
      ])
    }

    return buildResult(
      "openvpn",
      false,
      `OpenVPN admin login failed with HTTP ${response.statusCode}.`,
      [
        `Login endpoint: ${loginUrl}`,
        config.nodeName.trim() ? `Requested node: ${config.nodeName.trim()}` : "Requested node: default routing",
        summarizePayload(response.json ?? response.text) || "No additional response details were returned.",
      ],
    )
  } catch (error) {
    return buildResult("openvpn", false, "Unable to reach the OpenVPN Access Server API.", [
      `Login endpoint: ${loginUrl}`,
      error instanceof Error ? error.message : "Unknown connection error",
    ])
  }
}

export async function testSmtpConnection(
  config: SmtpSettingsRecord,
  connector: SystemConnectionKey = "smtp",
) {
  const timeoutMs = 6_000
  let socket: Socket | TLSSocket | null = null
  let reader: ReturnType<typeof createSocketReader> | null = null

  if (isPlaceholderHost(config.host)) {
    return buildResult(connector, false, "Set a real SMTP host before running a connection check.", [
      `Server: ${config.host}:${config.port}`,
    ])
  }

  if (config.requireAuth && !config.password.trim()) {
    return buildResult(connector, false, "SMTP password is required when authentication is enabled.", [
      `Server: ${config.host}:${config.port}`,
      `Username: ${config.username || "not set"}`,
    ])
  }

  try {
    const session = await openSmtpSession(config, timeoutMs)
    socket = session.socket
    reader = session.reader

    return buildResult(connector, true, "SMTP handshake completed successfully.", [
      `Server: ${config.host}:${config.port}`,
      `TLS mode: ${session.transportDescription}`,
      `Certificate verification: ${config.insecureSkipVerify ? "skipped" : "strict"}`,
      `Authentication: ${config.requireAuth ? session.authMethod : "disabled"}`,
      `Advertised capabilities: ${session.capabilities.lines
        .map((line) => (line.length > 4 ? line.slice(4).trim() : line.trim()))
        .join(", ")}`,
    ])
  } catch (error) {
    const details = [
      `Server: ${config.host}:${config.port}`,
      `TLS mode: ${formatSmtpTlsModeLabel(config.tlsMode)}`,
      `Certificate verification: ${config.insecureSkipVerify ? "skipped" : "strict"}`,
      `Authentication: ${config.requireAuth ? "enabled" : "disabled"}`,
      `Connection error: ${describeConnectionError(error)}`,
    ]

    if (isAliyunDirectMailHost(config.host)) {
      details.push(...buildAliyunDirectMailHints(config, error))
    }

    return buildResult(connector, false, "Unable to establish an SMTP session.", details)
  } finally {
    await closeSmtpSession(socket, reader)
  }
}

export async function sendSmtpEmail(
  config: SmtpSettingsRecord,
  input: {
    to: string
    subject: string
    html: string
  },
) {
  const timeoutMs = 8_000
  let socket: Socket | TLSSocket | null = null
  let reader: ReturnType<typeof createSocketReader> | null = null

  if (isPlaceholderHost(config.host)) {
    throw new Error("SMTP welcome connection still uses a placeholder host")
  }

  if (!config.fromAddress.trim()) {
    throw new Error("SMTP From address is required before sending email")
  }

  if (!input.to.trim()) {
    throw new Error("Welcome recipient email is missing")
  }

  try {
    const session = await openSmtpSession(config, timeoutMs)
    socket = session.socket
    reader = session.reader

    await writeCommand(socket, `MAIL FROM:<${config.fromAddress.trim()}>`)
    const mailFromResponse = await reader.readResponse()

    if (mailFromResponse.code !== 250) {
      throw new Error(`SMTP MAIL FROM failed: ${mailFromResponse.message}`)
    }

    await writeCommand(socket, `RCPT TO:<${input.to.trim()}>`)
    const rcptToResponse = await reader.readResponse()

    if (rcptToResponse.code !== 250 && rcptToResponse.code !== 251) {
      throw new Error(`SMTP RCPT TO failed: ${rcptToResponse.message}`)
    }

    await writeCommand(socket, "DATA")
    const dataResponse = await reader.readResponse()

    if (dataResponse.code !== 354) {
      throw new Error(`SMTP DATA failed: ${dataResponse.message}`)
    }

    const messageLines = [
      `From: ${formatMailboxHeader(config.fromAddress, config.fromName)}`,
      `To: <${input.to.trim()}>`,
      `Subject: ${encodeMimeWord(input.subject.trim())}`,
      `Date: ${new Date().toUTCString()}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=UTF-8",
      "Content-Transfer-Encoding: 8bit",
      "",
      normalizeSmtpBody(input.html),
      ".",
      "",
    ]

    await writeRaw(socket, messageLines.join("\r\n"))
    const completedDataResponse = await reader.readResponse()

    if (completedDataResponse.code !== 250) {
      throw new Error(`SMTP message delivery failed: ${completedDataResponse.message}`)
    }
  } finally {
    await closeSmtpSession(socket, reader)
  }
}

export async function testConnectorConnection(
  connector: SystemConnectionKey,
  settings: KeycloakConnectionRecord | OpenVpnConnectionRecord | SmtpSettingsRecord,
): Promise<ConnectionTestResult> {
  switch (connector) {
    case "keycloak":
      return testKeycloakConnection(settings as KeycloakConnectionRecord)
    case "openvpn":
      return testOpenVpnConnection(settings as OpenVpnConnectionRecord)
    case "smtp":
    case "smtp-welcome":
      return testSmtpConnection(settings as SmtpSettingsRecord, connector)
  }
}
