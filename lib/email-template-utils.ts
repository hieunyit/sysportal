export type TemplateCategory = "notification" | "welcome" | "announcement" | "custom"

export interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  description: string
  html: string
  sampleData: Record<string, string>
  updatedAt: string
}

export interface TemplateDraft {
  id: string
  name: string
  category: TemplateCategory
  subject: string
  description: string
  html: string
  sampleDataText: string
  updatedAt?: string
}

export interface Notice {
  tone: "success" | "error"
  message: string
}

export const templateCategoryOptions: Array<{ value: TemplateCategory; label: string }> = [
  { value: "notification", label: "Notification" },
  { value: "welcome", label: "Welcome" },
  { value: "announcement", label: "Announcement" },
  { value: "custom", label: "Custom" },
]

export const newTemplateScaffold = {
  name: "New HTML Email Template",
  category: "custom" as TemplateCategory,
  subject: "{{headline}}",
  description: "Editable HTML email template for internal delivery workflows.",
  html: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{{headline}}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f7fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#102a43;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d9e2ec;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 36px;background:linear-gradient(135deg,#0f4c81,#0f766e);color:#ffffff;">
                <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.84;">Template Header</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;">{{headline}}</h1>
                <p style="margin:14px 0 0 0;font-size:15px;line-height:1.7;opacity:0.92;">{{intro}}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px;">
                <p style="margin:0;font-size:15px;line-height:1.8;color:#334e68;">{{bodyCopy}}</p>
                <p style="margin:28px 0 0 0;">
                  <a href="{{ctaUrl}}" style="display:inline-block;padding:14px 22px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">{{ctaLabel}}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim(),
  sampleData: {
    headline: "Subject headline",
    intro: "Short introduction copy goes here.",
    bodyCopy: "Use this area for your detailed message, process notes, or onboarding instructions.",
    ctaLabel: "Open action",
    ctaUrl: "https://example.com",
  },
}

export function formatTimestamp(value?: string | null) {
  if (!value) {
    return "Not available"
  }

  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString()
}

export function readResponseMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as {
    error?: string
    detail?: string
    message?: string
    details?: Array<{ message?: string }>
  }

  return (
    response.detail ??
    response.error ??
    response.message ??
    response.details?.map((item) => item.message).filter(Boolean).join("; ") ??
    fallback
  )
}

export function toDraft(template: EmailTemplate): TemplateDraft {
  return {
    id: template.id,
    name: template.name,
    category: (template.category as TemplateCategory) ?? "custom",
    subject: template.subject,
    description: template.description,
    html: template.html,
    sampleDataText: JSON.stringify(template.sampleData, null, 2),
    updatedAt: template.updatedAt,
  }
}

export function parseSampleData(value: string) {
  const parsed = JSON.parse(value) as Record<string, unknown>

  return Object.fromEntries(
    Object.entries(parsed).map(([key, item]) => [key, typeof item === "string" ? item : String(item)]),
  )
}

function resolveToken(source: Record<string, string>, token: string) {
  const direct = source[token]

  if (typeof direct === "string") {
    return direct
  }

  const segments = token.split(".")
  let current: unknown = source

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null
    }

    current = (current as Record<string, unknown>)[segment]
  }

  return typeof current === "string" ? current : current == null ? null : String(current)
}

export function renderTemplateText(value: string, sampleData: Record<string, string>) {
  const renderedConditionals = value.replace(
    /\{\{\s*if\s+\.?([a-zA-Z0-9_.-]+)\s*\}\}([\s\S]*?)(?:\{\{\s*else\s*\}\}([\s\S]*?))?\{\{\s*end\s*\}\}/g,
    (_, token: string, truthyBlock: string, falsyBlock?: string) => {
      const resolved = resolveToken(sampleData, token)
      return resolved?.trim() ? truthyBlock : (falsyBlock ?? "")
    },
  )

  const renderedDotTokens = renderedConditionals.replace(
    /\{\{\s*\.([a-zA-Z0-9_.-]+)\s*\}\}/g,
    (_, token: string) => {
      return resolveToken(sampleData, token) ?? `{{.${token}}}`
    },
  )

  return renderedDotTokens.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, token: string) => {
    return resolveToken(sampleData, token) ?? `{{${token}}}`
  })
}

export function extractTokens(...values: string[]) {
  const matches = new Set<string>()

  values.forEach((value) => {
    Array.from(value.matchAll(/\{\{\s*if\s+\.?([a-zA-Z0-9_.-]+)\s*\}\}/g)).forEach((match) => {
      if (match[1]) {
        matches.add(match[1])
      }
    })

    Array.from(value.matchAll(/\{\{\s*\.([a-zA-Z0-9_.-]+)\s*\}\}/g)).forEach((match) => {
      if (match[1]) {
        matches.add(match[1])
      }
    })

    Array.from(value.matchAll(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g)).forEach((match) => {
      if (match[1]) {
        matches.add(match[1])
      }
    })
  })

  return Array.from(matches)
}

export function buildPreviewDocument(html: string) {
  if (/<html[\s>]/i.test(html)) {
    return html
  }

  return `<!DOCTYPE html><html lang="en"><body style="margin:0;background:#f4f7fb;">${html}</body></html>`
}

export function getTemplateCategoryBadgeClass(category: string) {
  switch (category) {
    case "notification":
      return "border-primary/25 bg-primary/10 text-primary"
    case "welcome":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    case "announcement":
      return "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-300"
    default:
      return "border-border bg-background text-muted-foreground"
  }
}
