import { z } from "zod"

const optionalSecret = z.string().max(255)
const optionalCredential = z.string().trim().max(160)

export const connectorKeySchema = z.enum(["keycloak", "openvpn", "smtp", "smtp-welcome"])

export const profileSettingsSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255),
  role: z.string().trim().min(1).max(160),
  team: z.string().trim().min(1).max(160),
})

export const keycloakSettingsSchema = z.object({
  serverUrl: z.string().trim().url().max(255),
  realm: z.string().trim().min(1).max(120),
  clientId: z.string().trim().min(1).max(160),
  clientSecret: optionalSecret,
  ldapProviderId: z.string().trim().max(160),
  verifyTls: z.boolean(),
  timeoutSeconds: z.coerce.number().int().min(1).max(120),
})

export const openVpnSettingsSchema = z.object({
  serverUrl: z.string().trim().url().max(255),
  apiBasePath: z.string().trim().min(1).max(120),
  username: z.string().trim().min(1).max(160),
  password: optionalSecret,
  nodeName: z.string().trim().max(160),
  verifyTls: z.boolean(),
  timeoutSeconds: z.coerce.number().int().min(1).max(120),
})

export const smtpSettingsSchema = z
  .object({
    host: z.string().trim().min(1).max(255),
    port: z.coerce.number().int().min(1).max(65_535),
    username: optionalCredential,
    password: optionalSecret,
    fromAddress: z.string().trim().email().max(255),
    fromName: z.string().trim().min(1).max(160),
    tlsMode: z.enum(["direct", "starttls", "none"]).optional(),
    security: z.enum(["starttls", "ssl_tls", "none"]).optional(),
    insecureSkipVerify: z.boolean().optional(),
    requireAuth: z.boolean(),
  })
  .superRefine((value, context) => {
    if (!value.requireAuth) {
      return
    }

    if (!value.username.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["username"],
        message: "SMTP username is required when authentication is enabled",
      })
    }
  })
  .transform((value) => ({
    host: value.host,
    port: value.port,
    username: value.username,
    password: value.password,
    fromAddress: value.fromAddress,
    fromName: value.fromName,
    tlsMode:
      value.tlsMode ??
      (value.security === "ssl_tls"
        ? "direct"
        : value.security === "none"
          ? "none"
          : value.security === "starttls"
            ? "starttls"
            : "starttls"),
    insecureSkipVerify: value.insecureSkipVerify ?? false,
    requireAuth: value.requireAuth,
  }))

export const systemSettingsSchema = z.object({
  keycloak: keycloakSettingsSchema,
  openvpn: openVpnSettingsSchema,
  smtp: smtpSettingsSchema,
  smtpWelcome: smtpSettingsSchema,
})

export const emailTemplateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  category: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(320),
  html: z.string().trim().min(1),
  sampleData: z.record(z.string().max(400)).default({}),
})

export function getConnectionSchema(connector: z.infer<typeof connectorKeySchema>) {
  switch (connector) {
    case "keycloak":
      return keycloakSettingsSchema
    case "openvpn":
      return openVpnSettingsSchema
    case "smtp":
    case "smtp-welcome":
      return smtpSettingsSchema
  }
}

export const notificationSettingSchema = z.object({
  id: z.string().trim().min(1).max(80),
  label: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(320),
  enabled: z.boolean(),
})

export const notificationSettingsSchema = z.object({
  items: z.array(notificationSettingSchema).min(1),
})

export const notificationSettingPatchSchema = notificationSettingSchema.partial().omit({ id: true }).refine(
  (value) => Object.keys(value).length > 0,
  {
    message: "At least one notification field is required",
  },
)

export const appearanceSettingsSchema = z.object({
  theme: z.enum(["light", "dark"]),
})

export function formatZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }))
}
