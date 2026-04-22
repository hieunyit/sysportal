"use client"

import { type ChangeEvent, useMemo, useState } from "react"
import {
  AlertCircle,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Upload,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface UserImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported?: (successCount: number) => void
}

interface ImportedCsvRow {
  rowNumber: number
  values: Record<string, string>
}

interface ImportResult {
  rowNumber: number
  username: string
  status: "success" | "error"
  detail: string
  generatedPassword: string | null
  welcomeEmailStatus: string | null
  groupStatus: string | null
}

const csvHeaders = [
  "username",
  "firstName",
  "lastName",
  "email",
  "fullName",
  "userType",
  "phone",
  "department",
  "manager",
  "employeeID",
  "State",
  "title",
  "companyName",
  "userExpiryVPN",
  "uuidVPN",
  "password",
  "temporaryPassword",
  "welcomeRecipientEmail",
  "workAddress",
  "enabled",
] as const

const csvTemplateRows = [
  [
    "test.employee1",
    "An",
    "Nguyen",
    "an.nguyen@mobifonesolutions.vn",
    "Nguyen An",
    "employee",
    "0912345678",
    "Văn phòng",
    "hai.cu@mbfs.vn",
    "12345",
    "",
    "Nhân viên",
    "",
    "",
    "",
    "",
    "true",
    "manager@mobifonesolutions.vn",
    "38 Phan Dinh Phung, Ba Dinh, Ha Noi",
    "true",
  ],
  [
    "partner.demo1",
    "Linh",
    "Tran",
    "linh.tran.partner@example.com",
    "Tran Linh",
    "partner",
    "",
    "",
    "",
    "",
    "",
    "",
    "Partner Co., Ltd",
    "2026-05-30",
    "vpn-uuid-001|vpn-uuid-002",
    "",
    "true",
    "",
    "",
    "",
    "true",
  ],
]

function readErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") {
    return fallback
  }

  const response = payload as {
    detail?: string
    error?: string
    issues?: Array<{ path?: string; message?: string }>
  }
  const issueMessage = response.issues
    ?.map((issue) => {
      const path = issue.path?.trim()
      const message = issue.message?.trim()
      return path ? `${path}: ${message}` : message
    })
    .filter(Boolean)
    .join("; ")

  return response.detail ?? issueMessage ?? response.error ?? fallback
}

function parseBoolean(value: string, defaultValue: boolean) {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return defaultValue
  }

  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false
  }

  return defaultValue
}

function parsePipeList(value: string) {
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseCsvDocument(text: string) {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentValue = ""
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const nextCharacter = text[index + 1]

    if (character === "\"") {
      if (inQuotes && nextCharacter === "\"") {
        currentValue += "\""
        index += 1
      } else {
        inQuotes = !inQuotes
      }

      continue
    }

    if (character === "," && !inQuotes) {
      currentRow.push(currentValue)
      currentValue = ""
      continue
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1
      }

      currentRow.push(currentValue)
      rows.push(currentRow)
      currentRow = []
      currentValue = ""
      continue
    }

    currentValue += character
  }

  currentRow.push(currentValue)
  rows.push(currentRow)

  return rows
    .map((row) => row.map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0))
}

function buildRowsFromCsv(text: string): ImportedCsvRow[] {
  const parsedRows = parseCsvDocument(text)

  if (parsedRows.length === 0) {
    throw new Error("CSV file is empty")
  }

  const headers = parsedRows[0].map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  )

  const missingHeaders = csvHeaders.filter((header) => !headers.includes(header))

  if (missingHeaders.length > 0) {
    throw new Error(`Missing required CSV columns: ${missingHeaders.join(", ")}`)
  }

  return parsedRows.slice(1).map((row, index) => {
    const values = Object.fromEntries(
      headers.map((header, headerIndex) => [header, row[headerIndex] ?? ""]),
    )

    return {
      rowNumber: index + 2,
      values,
    }
  })
}

function buildPayloadFromRow(row: ImportedCsvRow) {
  const userType = row.values.userType?.trim() ?? ""
  const username = row.values.username?.trim() ?? ""
  const email = row.values.email?.trim() ?? ""
  const firstName = row.values.firstName?.trim() ?? ""
  const lastName = row.values.lastName?.trim() ?? ""
  const fullName = row.values.fullName?.trim() || [firstName, lastName].filter(Boolean).join(" ").trim()

  if (!username) {
    throw new Error("username is required")
  }

  if (!userType) {
    throw new Error("userType is required")
  }

  if (!email) {
    throw new Error("email is required")
  }

  if (!firstName) {
    throw new Error("firstName is required")
  }

  if (!lastName) {
    throw new Error("lastName is required")
  }

  const isEmployee = userType === "employee"

  if (isEmployee && !(row.values.welcomeRecipientEmail?.trim() ?? "")) {
    throw new Error("welcomeRecipientEmail is required for employee accounts")
  }

  return {
    username,
    firstName,
    lastName,
    email,
    enabled: parseBoolean(row.values.enabled ?? "", true),
    emailVerified: true,
    requiredActions: ["UPDATE_PASSWORD", "CONFIGURE_TOTP"],
    password: row.values.password?.trim() ?? "",
    temporaryPassword: parseBoolean(row.values.temporaryPassword ?? "", true),
    welcomeRecipientEmail: isEmployee ? row.values.welcomeRecipientEmail?.trim() ?? "" : "",
    workAddress: isEmployee ? row.values.workAddress?.trim() ?? "" : "",
    attributes: {
      fullName,
      phone: isEmployee ? row.values.phone?.trim() ?? "" : "",
      department: isEmployee ? row.values.department?.trim() ?? "" : "",
      manager: isEmployee ? row.values.manager?.trim() ?? "" : "",
      employeeID: isEmployee ? row.values.employeeID?.trim() ?? "" : "",
      State: isEmployee ? row.values.State?.trim() ?? "" : "",
      title: isEmployee ? row.values.title?.trim() ?? "" : "",
      userType,
      companyName: isEmployee ? "" : row.values.companyName?.trim() ?? "",
      userExpiryVPN: row.values.userExpiryVPN?.trim() ?? "",
      uuidVPN: parsePipeList(row.values.uuidVPN ?? ""),
    },
  }
}

function buildCsvTemplate() {
  const rows = [csvHeaders.join(",")]

  csvTemplateRows.forEach((row) => {
    rows.push(
      row
        .map((value) => {
          const escaped = value.replace(/"/g, "\"\"")
          return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
        })
        .join(","),
    )
  })

  return rows.join("\r\n")
}

export function UserImportDialog({
  open,
  onOpenChange,
  onImported,
}: UserImportDialogProps) {
  const [fileName, setFileName] = useState("")
  const [rows, setRows] = useState<ImportedCsvRow[]>([])
  const [results, setResults] = useState<ImportResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const previewRows = useMemo(() => rows.slice(0, 6), [rows])
  const successCount = results.filter((item) => item.status === "success").length
  const failureCount = results.filter((item) => item.status === "error").length

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      setFileName("")
      setRows([])
      setResults([])
      setError(null)
      return
    }

    try {
      const text = await file.text()
      const parsedRows = buildRowsFromCsv(text)

      setFileName(file.name)
      setRows(parsedRows)
      setResults([])
      setError(null)
    } catch (fileError) {
      setFileName(file.name)
      setRows([])
      setResults([])
      setError(fileError instanceof Error ? fileError.message : "Unable to parse CSV file")
    }
  }

  function handleDownloadTemplate() {
    const csvWithBom = `\uFEFF${buildCsvTemplate()}`
    const blob = new Blob([csvWithBom], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "keycloak-user-import-template.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    try {
      setIsImporting(true)
      setError(null)
      setResults([])

      const nextResults: ImportResult[] = []

      for (const row of rows) {
        try {
          const payload = buildPayloadFromRow(row)
          const response = await fetch("/api/keycloak/users", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          })
          const responsePayload = await response.json().catch(() => null)

          if (!response.ok) {
            throw new Error(readErrorMessage(responsePayload, "Unable to create Keycloak user"))
          }

          nextResults.push({
            rowNumber: row.rowNumber,
            username: payload.username,
            status: "success",
            detail:
              responsePayload?.defaultGroupAssignment?.assigned === false &&
              typeof responsePayload?.defaultGroupAssignment?.error === "string"
                ? `User created, but default group assignment failed: ${responsePayload.defaultGroupAssignment.error}`
                : "User created successfully",
            generatedPassword:
              typeof responsePayload?.generatedPassword === "string"
                ? responsePayload.generatedPassword
                : null,
            groupStatus:
              responsePayload?.defaultGroupAssignment?.assigned === true
                ? `Assigned to ${String(responsePayload.defaultGroupAssignment.groupName ?? "")}`
                : typeof responsePayload?.defaultGroupAssignment?.error === "string"
                  ? `Failed: ${responsePayload.defaultGroupAssignment.error}`
                  : null,
            welcomeEmailStatus:
              responsePayload?.welcomeEmail?.sent === true
                ? `Sent to ${String(responsePayload.welcomeEmail.recipient ?? "")}`
                : typeof responsePayload?.welcomeEmail?.error === "string"
                  ? `Failed: ${responsePayload.welcomeEmail.error}`
                  : null,
          })
        } catch (rowError) {
          nextResults.push({
            rowNumber: row.rowNumber,
            username: row.values.username?.trim() || `Row ${row.rowNumber}`,
            status: "error",
            detail: rowError instanceof Error ? rowError.message : "Import failed",
            generatedPassword: null,
            groupStatus: null,
            welcomeEmailStatus: null,
          })
        }

        setResults([...nextResults])
      }

      const createdCount = nextResults.filter((item) => item.status === "success").length

      if (createdCount > 0) {
        onImported?.(createdCount)
      }
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-hidden rounded-[1.5rem] border-border/70 bg-card p-0">
        <DialogHeader className="border-b border-border px-6 py-5">
          <DialogTitle>Import users from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file, review the rows, then create users in batch using the same Keycloak API flow as the single-user form.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Import file error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),320px]">
            <div className="rounded-[1.2rem] border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                <p className="text-sm font-semibold text-foreground">CSV upload</p>
                <p className="mt-1 text-sm text-muted-foreground">
                    Use pipe separators for multi-value fields such as `uuidVPN`.
                </p>
                </div>
                <Button type="button" variant="outline" className="rounded-full bg-transparent" onClick={handleDownloadTemplate}>
                  <Download className="h-4 w-4" />
                  Download template
                </Button>
              </div>

              <div className="mt-5 space-y-3">
                <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isImporting} />
                <p className="text-xs text-muted-foreground">
                  Required columns: `{csvHeaders.slice(0, 6).join(", ")}` ... plus the onboarding and attribute columns from the template.
                </p>
                <p className="text-xs text-muted-foreground">
                  `manager` can be provided as `username`, `email`, or `LDAP_ENTRY_DN`. The server resolves username/email to `LDAP_ENTRY_DN` before creating the user.
                </p>
                <p className="text-xs text-muted-foreground">
                  Imported users always start with `emailVerified = true` and required actions `UPDATE_PASSWORD | CONFIGURE_TOTP`.
                </p>
                <p className="text-xs text-muted-foreground">
                  Employee accounts are also assigned automatically to `jira-servicedesk-users`.
                </p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-border bg-background p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Import status</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {fileName ? `Loaded file: ${fileName}` : "No CSV file loaded yet."}
                  </p>
                </div>
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-foreground">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[1rem] border border-border bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Rows ready</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{rows.length}</p>
                </div>
                <div className="rounded-[1rem] border border-border bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Created</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{successCount}</p>
                </div>
                <div className="rounded-[1rem] border border-border bg-card px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Failed</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{failureCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.2rem] border border-border bg-background">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">Preview</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The first rows from the uploaded file are shown below before import starts.
              </p>
            </div>

            {previewRows.length === 0 ? (
              <div className="px-5 py-8 text-sm text-muted-foreground">Upload a CSV file to preview its rows.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">Row</TableHead>
                    <TableHead className="px-5">Username</TableHead>
                    <TableHead className="px-5">Email</TableHead>
                    <TableHead className="px-5">User type</TableHead>
                    <TableHead className="px-5">Welcome recipient</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row) => (
                    <TableRow key={row.rowNumber} className="border-border">
                      <TableCell className="px-5 py-4 text-sm text-muted-foreground">{row.rowNumber}</TableCell>
                      <TableCell className="px-5 py-4">{row.values.username || "Missing"}</TableCell>
                      <TableCell className="px-5 py-4">{row.values.email || "Missing"}</TableCell>
                      <TableCell className="px-5 py-4">{row.values.userType || "Missing"}</TableCell>
                      <TableCell className="px-5 py-4">
                        {row.values.userType?.trim() === "employee"
                          ? row.values.welcomeRecipientEmail || "Missing"
                          : row.values.email || "Account email"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {results.length > 0 ? (
            <div className="rounded-[1.2rem] border border-border bg-background">
              <div className="border-b border-border px-5 py-4">
                <p className="text-sm font-semibold text-foreground">Import results</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Each row is processed independently so one bad entry does not stop the entire batch.
                </p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/35">
                    <TableHead className="px-5">Row</TableHead>
                    <TableHead className="px-5">Username</TableHead>
                    <TableHead className="px-5">Status</TableHead>
                    <TableHead className="px-5">Group</TableHead>
                    <TableHead className="px-5">Welcome email</TableHead>
                    <TableHead className="px-5">Password</TableHead>
                    <TableHead className="px-5">Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((result) => (
                    <TableRow key={`${result.rowNumber}-${result.username}`} className="border-border">
                      <TableCell className="px-5 py-4 text-sm text-muted-foreground">{result.rowNumber}</TableCell>
                      <TableCell className="px-5 py-4">{result.username}</TableCell>
                      <TableCell className="px-5 py-4">
                        <Badge
                          variant="outline"
                          className={
                            result.status === "success"
                              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                              : "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                          }
                        >
                          {result.status === "success" ? "Created" : "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                        {result.groupStatus ?? "No default group"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-muted-foreground">
                        {result.welcomeEmailStatus ?? "Not sent"}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-foreground">
                        {result.generatedPassword ? (
                          <code className="rounded bg-muted px-2 py-1 text-xs">{result.generatedPassword}</code>
                        ) : (
                          "Provided or not generated"
                        )}
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-muted-foreground">{result.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border px-6 py-5">
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" className="rounded-full bg-transparent" onClick={() => onOpenChange(false)} disabled={isImporting}>
              Close
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" className="rounded-full bg-transparent" onClick={handleDownloadTemplate} disabled={isImporting}>
                <Download className="h-4 w-4" />
                Download template
              </Button>
              <Button type="button" className="rounded-full px-5" onClick={handleImport} disabled={isImporting || rows.length === 0}>
                {isImporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Start import
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
