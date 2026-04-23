import { randomUUID } from "node:crypto"
import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import Database from "better-sqlite3"
import {
  directoryDepartmentOptions as defaultDirectoryDepartmentOptions,
  directoryWorkAddressOptions as defaultDirectoryWorkAddressOptions,
  emailTemplates as defaultEmailTemplates,
  notificationSettings as defaultNotificationSettings,
  profileRoleOptions as defaultProfileRoleOptions,
  profileTeamOptions as defaultProfileTeamOptions,
  settingsAppearance as defaultAppearanceSettings,
  settingsProfile as defaultProfileSettings,
  systemSettings as defaultSystemSettings,
} from "@/lib/identity-ops-data"

type SqliteDatabase = InstanceType<typeof Database>

export interface KeycloakConnectionRecord {
  serverUrl: string
  realm: string
  clientId: string
  clientSecret: string
  ldapProviderId: string
  verifyTls: boolean
  timeoutSeconds: number
}

export interface OpenVpnConnectionRecord {
  serverUrl: string
  apiBasePath: string
  username: string
  password: string
  nodeName: string
  verifyTls: boolean
  timeoutSeconds: number
}

export interface SmtpSettingsRecord {
  host: string
  port: number
  username: string
  password: string
  fromAddress: string
  fromName: string
  tlsMode: "direct" | "starttls" | "none"
  insecureSkipVerify: boolean
  requireAuth: boolean
}

export interface SystemSettingsRecord {
  keycloak: KeycloakConnectionRecord
  openvpn: OpenVpnConnectionRecord
  smtp: SmtpSettingsRecord
  smtpWelcome: SmtpSettingsRecord
  updatedAt: string
}

export interface ProfileSettingsRecord {
  fullName: string
  email: string
  role: string
  team: string
  updatedAt: string
}

export const settingsOptionKinds = ["role", "team", "department", "workAddress"] as const

export type SettingsOptionKind = (typeof settingsOptionKinds)[number]
type ProfileOptionKind = Extract<SettingsOptionKind, "role" | "team">

export interface ProfileOptionsRecord {
  roles: string[]
  teams: string[]
}

export interface SettingsOptionListsRecord {
  role: string[]
  team: string[]
  department: string[]
  workAddress: string[]
}

export interface ProfileSettingsBundleRecord {
  profile: ProfileSettingsRecord
  options: ProfileOptionsRecord
}

export interface AuthenticatedUserRecord {
  subject: string
  preferredUsername: string
  fullName: string
  email: string
  roles: string[]
  lastLoginAt: string
  createdAt: string
  updatedAt: string
}

export interface NotificationSettingRecord {
  id: string
  label: string
  description: string
  enabled: boolean
  updatedAt: string
}

export interface AppearanceSettingsRecord {
  theme: "light" | "dark"
  updatedAt: string
}

export interface SettingsBundleRecord {
  notifications: NotificationSettingRecord[]
  appearance: AppearanceSettingsRecord
}

export interface EmailTemplateRecord {
  id: string
  name: string
  category: string
  subject: string
  description: string
  html: string
  sampleData: Record<string, string>
  updatedAt: string
}

export interface AuditLogRecord {
  id: string
  actorName: string
  category: "access" | "edit" | "action"
  action: string
  resourceType: string
  resourceId: string
  resourceName: string
  detail: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface AuditLogSummaryRecord {
  total: number
  accessCount: number
  editCount: number
  actionCount: number
  latestAt: string | null
}

export interface AuditLogFilterOptions {
  limit?: number
  resourceType?: string
  resourceId?: string
  category?: AuditLogRecord["category"]
  action?: string
  search?: string
}

export const connectionKeys = ["keycloak", "openvpn", "smtp", "smtp-welcome"] as const

export type SystemConnectionKey = (typeof connectionKeys)[number]

const connectionPropertyMap = {
  keycloak: "keycloak",
  openvpn: "openvpn",
  smtp: "smtp",
  "smtp-welcome": "smtpWelcome",
} as const

type ConnectionPropertyKey = (typeof connectionPropertyMap)[SystemConnectionKey]
type ConnectionRecord = SystemSettingsRecord[ConnectionPropertyKey]

declare global {
  var __identityOpsSettingsDb__: SqliteDatabase | undefined
}

const SETTINGS_DB_PATH = join(process.cwd(), "data", "identityops-settings.sqlite3")

function getTableColumnNames(database: SqliteDatabase, tableName: string) {
  return new Set(
    (
      database
        .prepare(`PRAGMA table_info(${tableName})`)
        .all() as Array<{ name: string }>
    ).map((column) => column.name),
  )
}

function tableExists(database: SqliteDatabase, tableName: string) {
  const row = database
    .prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table' AND name = ?
    `)
    .get(tableName) as { name: string } | undefined

  return Boolean(row?.name)
}

function toSqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function getDatabase() {
  if (!globalThis.__identityOpsSettingsDb__) {
    mkdirSync(dirname(SETTINGS_DB_PATH), { recursive: true })
    globalThis.__identityOpsSettingsDb__ = new Database(SETTINGS_DB_PATH)
  }

  const database = globalThis.__identityOpsSettingsDb__
  ensureSchema(database)
  seedDefaults(database)

  return database
}

function ensureSchema(database: SqliteDatabase) {
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings_profile (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      team TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings_profile_options (
      kind TEXT NOT NULL CHECK (kind IN ('role', 'team')),
      value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (kind, value)
    );

    CREATE TABLE IF NOT EXISTS settings_option_lists (
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (kind, value)
    );

    CREATE TABLE IF NOT EXISTS settings_connections (
      id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings_notifications (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT NOT NULL,
      enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
      sort_order INTEGER NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings_appearance (
      id TEXT PRIMARY KEY,
      theme TEXT NOT NULL CHECK (theme IN ('light', 'dark')),
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      html_content TEXT NOT NULL,
      sample_data_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('access', 'edit', 'action')),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      resource_name TEXT NOT NULL,
      detail TEXT NOT NULL,
      metadata_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_users (
      subject TEXT PRIMARY KEY,
      preferred_username TEXT NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      roles_json TEXT NOT NULL,
      last_login_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  let profileColumns = getTableColumnNames(database, "settings_profile")

  if (profileColumns.has("shift_name") || profileColumns.has("escalation_group")) {
    const roleExpression = [
      profileColumns.has("role") ? "NULLIF(TRIM(role), '')" : null,
      profileColumns.has("shift_name") ? "NULLIF(TRIM(shift_name), '')" : null,
      toSqlString(defaultProfileSettings.role),
    ]
      .filter(Boolean)
      .join(", ")

    const teamExpression = [
      profileColumns.has("team") ? "NULLIF(TRIM(team), '')" : null,
      profileColumns.has("escalation_group") ? "NULLIF(TRIM(escalation_group), '')" : null,
      toSqlString(defaultProfileSettings.team),
    ]
      .filter(Boolean)
      .join(", ")

    try {
      database.exec(`
        BEGIN IMMEDIATE;

        DROP TABLE IF EXISTS settings_profile_next;

        CREATE TABLE settings_profile_next (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL,
          team TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO settings_profile_next (id, full_name, email, role, team, updated_at)
        SELECT
          id,
          full_name,
          email,
          COALESCE(${roleExpression}),
          COALESCE(${teamExpression}),
          COALESCE(NULLIF(updated_at, ''), ${toSqlString(new Date().toISOString())})
        FROM settings_profile;

        DROP TABLE settings_profile;
        ALTER TABLE settings_profile_next RENAME TO settings_profile;

        COMMIT;
      `)
    } catch (error) {
      try {
        database.exec("ROLLBACK;")
      } catch {
        // Ignore rollback errors if SQLite already closed the transaction.
      }

      throw error
    }

    profileColumns = getTableColumnNames(database, "settings_profile")
  }

  if (!profileColumns.has("role")) {
    database.exec(`ALTER TABLE settings_profile ADD COLUMN role TEXT NOT NULL DEFAULT ''`)
  }

  if (!profileColumns.has("team")) {
    database.exec(`ALTER TABLE settings_profile ADD COLUMN team TEXT NOT NULL DEFAULT ''`)
  }

  if (profileColumns.has("shift_name")) {
    database.exec(`
      UPDATE settings_profile
      SET role = shift_name
      WHERE TRIM(COALESCE(role, '')) = ''
    `)
  }

  if (profileColumns.has("escalation_group")) {
    database.exec(`
      UPDATE settings_profile
      SET team = escalation_group
      WHERE TRIM(COALESCE(team, '')) = ''
    `)
  }

  if (tableExists(database, "settings_profile_options")) {
    database.exec(`
      INSERT INTO settings_option_lists (kind, value, sort_order, updated_at)
      SELECT kind, value, sort_order, updated_at
      FROM settings_profile_options
      WHERE kind IN ('role', 'team')
      ON CONFLICT(kind, value) DO UPDATE SET
        sort_order = excluded.sort_order,
        updated_at = excluded.updated_at
    `)
  }

  const connectionColumns = getTableColumnNames(database, "settings_connections")

  if (!connectionColumns.has("config_json")) {
    database.exec(`ALTER TABLE settings_connections ADD COLUMN config_json TEXT NOT NULL DEFAULT '{}'`)
  }

  if (!connectionColumns.has("updated_at")) {
    database.exec(`ALTER TABLE settings_connections ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`)
  }

  const appearanceColumns = getTableColumnNames(database, "settings_appearance")

  if (!appearanceColumns.has("updated_at")) {
    database.exec(`ALTER TABLE settings_appearance ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`)
  }

  const emailTemplateColumns = getTableColumnNames(database, "email_templates")

  if (!emailTemplateColumns.has("html_content")) {
    database.exec(`ALTER TABLE email_templates ADD COLUMN html_content TEXT NOT NULL DEFAULT ''`)
  }

  if (!emailTemplateColumns.has("sample_data_json")) {
    database.exec(`ALTER TABLE email_templates ADD COLUMN sample_data_json TEXT NOT NULL DEFAULT '{}'`)
  }

  if (!emailTemplateColumns.has("updated_at")) {
    database.exec(`ALTER TABLE email_templates ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''`)
  }
}

function seedDefaults(database: SqliteDatabase) {
  const now = new Date().toISOString()
  const currentWelcomeTemplate = defaultEmailTemplates.find((template) => template.id === "new-joiner-welcome")

  database
    .prepare(`
      INSERT INTO settings_profile (id, full_name, email, role, team, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `)
    .run(
      "primary",
      defaultProfileSettings.fullName,
      defaultProfileSettings.email,
      defaultProfileSettings.role,
      defaultProfileSettings.team,
      now,
    )

  database.exec(`
    UPDATE settings_profile
    SET role = '${defaultProfileSettings.role.replace(/'/g, "''")}'
    WHERE TRIM(COALESCE(role, '')) = '';

    UPDATE settings_profile
    SET team = '${defaultProfileSettings.team.replace(/'/g, "''")}'
    WHERE TRIM(COALESCE(team, '')) = '';
  `)

  const defaultRoleOptions = Array.from(
    new Set([defaultProfileSettings.role, ...defaultProfileRoleOptions].map((item) => item.trim()).filter(Boolean)),
  )
  const defaultTeamOptions = Array.from(
    new Set([defaultProfileSettings.team, ...defaultProfileTeamOptions].map((item) => item.trim()).filter(Boolean)),
  )
  const defaultDepartmentOptions = Array.from(
    new Set(defaultDirectoryDepartmentOptions.map((item) => item.trim()).filter(Boolean)),
  )
  const defaultWorkAddressOptions = Array.from(
    new Set(defaultDirectoryWorkAddressOptions.map((item) => item.trim()).filter(Boolean)),
  )

  const insertProfileOption = database.prepare(`
    INSERT INTO settings_option_lists (kind, value, sort_order, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(kind, value) DO UPDATE SET
      updated_at = excluded.updated_at
  `)

  defaultRoleOptions.forEach((value, index) => {
    insertProfileOption.run("role", value, index, now)
  })

  defaultTeamOptions.forEach((value, index) => {
    insertProfileOption.run("team", value, index, now)
  })

  defaultDepartmentOptions.forEach((value, index) => {
    insertProfileOption.run("department", value, index, now)
  })

  defaultWorkAddressOptions.forEach((value, index) => {
    insertProfileOption.run("workAddress", value, index, now)
  })

  database.exec(`
    INSERT INTO settings_option_lists (kind, value, sort_order, updated_at)
    SELECT 'role', role, ${defaultRoleOptions.length}, '${now.replace(/'/g, "''")}'
    FROM settings_profile
    WHERE TRIM(COALESCE(role, '')) <> ''
    ON CONFLICT(kind, value) DO UPDATE SET
      updated_at = excluded.updated_at;

    INSERT INTO settings_option_lists (kind, value, sort_order, updated_at)
    SELECT 'team', team, ${defaultTeamOptions.length}, '${now.replace(/'/g, "''")}'
    FROM settings_profile
    WHERE TRIM(COALESCE(team, '')) <> ''
    ON CONFLICT(kind, value) DO UPDATE SET
      updated_at = excluded.updated_at;
  `)

  database
    .prepare(`
      INSERT INTO settings_connections (id, config_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `)
    .run("primary", JSON.stringify(defaultSystemSettings), now)

  const notificationCount = database
    .prepare(`SELECT COUNT(*) AS total FROM settings_notifications`)
    .get() as { total: number }

  if (notificationCount.total === 0) {
    const insertNotification = database.prepare(`
      INSERT INTO settings_notifications (id, label, description, enabled, sort_order, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    defaultNotificationSettings.forEach((item, index) => {
      insertNotification.run(item.id, item.label, item.description, item.enabled ? 1 : 0, index, now)
    })
  }

  database
    .prepare(`
      INSERT INTO settings_appearance (id, theme, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO NOTHING
    `)
    .run("primary", defaultAppearanceSettings.theme, now)

  const emailTemplateCount = database
    .prepare(`SELECT COUNT(*) AS total FROM email_templates`)
    .get() as { total: number }

  if (emailTemplateCount.total === 0) {
    const insertTemplate = database.prepare(`
      INSERT INTO email_templates (
        id,
        name,
        category,
        subject,
        description,
        html_content,
        sample_data_json,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    defaultEmailTemplates.forEach((template) => {
      insertTemplate.run(
        template.id,
        template.name,
        template.category,
        template.subject,
        template.description,
        template.html,
        JSON.stringify(template.sampleData),
        now,
      )
    })
  }

  if (currentWelcomeTemplate) {
    database
      .prepare(`
        UPDATE email_templates
        SET
          name = ?,
          category = ?,
          subject = ?,
          description = ?,
          html_content = ?,
          sample_data_json = ?,
          updated_at = ?
        WHERE id = ?
          AND subject IN (?, ?, ?)
      `)
      .run(
        currentWelcomeTemplate.name,
        currentWelcomeTemplate.category,
        currentWelcomeTemplate.subject,
        currentWelcomeTemplate.description,
        currentWelcomeTemplate.html,
        JSON.stringify(currentWelcomeTemplate.sampleData),
        now,
        currentWelcomeTemplate.id,
        "Welcome to {{companyName}}, {{firstName}}",
        "Thư chào mừng nhân sự mới",
        "[MobiFone Solutions] Thư chào mừng nhân sự mới - {{.RecipientName}}",
      )
  }
}

type LegacySmtpSettingsRecord = Partial<SmtpSettingsRecord> & {
  security?: "starttls" | "ssl_tls" | "none"
}

function normalizeSmtpSettings(
  config: LegacySmtpSettingsRecord | undefined,
  defaults: SmtpSettingsRecord,
): SmtpSettingsRecord {
  const merged = {
    ...defaults,
    ...(config ?? {}),
  }

  const tlsMode =
    typeof config?.tlsMode === "string"
      ? config.tlsMode
      : config?.security === "ssl_tls"
        ? "direct"
        : config?.security === "none"
          ? "none"
        : config?.security === "starttls"
            ? "starttls"
            : defaults.tlsMode

  return {
    host: merged.host,
    port: merged.port,
    username: merged.username,
    password: merged.password,
    fromAddress: merged.fromAddress,
    fromName: merged.fromName,
    tlsMode,
    insecureSkipVerify:
      typeof config?.insecureSkipVerify === "boolean"
        ? config.insecureSkipVerify
        : defaults.insecureSkipVerify,
    requireAuth: merged.requireAuth,
  }
}

function parseSystemConfig(configJson: string, updatedAt: string) {
  try {
    const config = JSON.parse(configJson) as Partial<Omit<SystemSettingsRecord, "updatedAt">> & {
      smtp?: LegacySmtpSettingsRecord
      smtpWelcome?: LegacySmtpSettingsRecord
    }

    return {
      keycloak: {
        ...defaultSystemSettings.keycloak,
        ...(config.keycloak ?? {}),
      },
      openvpn: {
        ...defaultSystemSettings.openvpn,
        ...(config.openvpn ?? {}),
      },
      smtp: normalizeSmtpSettings(config.smtp, defaultSystemSettings.smtp),
      smtpWelcome: normalizeSmtpSettings(config.smtpWelcome, defaultSystemSettings.smtpWelcome),
      updatedAt,
    } as SystemSettingsRecord
  } catch {
    return {
      ...(defaultSystemSettings as Omit<SystemSettingsRecord, "updatedAt">),
      updatedAt,
    }
  }
}

function ensureProfileRow(database: SqliteDatabase) {
  let row = database
    .prepare(`
      SELECT
        full_name AS fullName,
        email,
        role,
        team,
        updated_at AS updatedAt
      FROM settings_profile
      WHERE id = ?
    `)
    .get("primary") as ProfileSettingsRecord | undefined

  if (!row) {
    const updatedAt = new Date().toISOString()

    database
      .prepare(`
        INSERT INTO settings_profile (id, full_name, email, role, team, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `)
      .run(
        "primary",
        defaultProfileSettings.fullName,
        defaultProfileSettings.email,
        defaultProfileSettings.role,
        defaultProfileSettings.team,
        updatedAt,
      )

    row = database
      .prepare(`
        SELECT
          full_name AS fullName,
          email,
          role,
          team,
          updated_at AS updatedAt
        FROM settings_profile
        WHERE id = ?
      `)
      .get("primary") as ProfileSettingsRecord | undefined
  }

  if (!row) {
    throw new Error("Profile settings are not initialized")
  }

  return row
}

function ensureSystemRow(database: SqliteDatabase) {
  let row = database
    .prepare(`
      SELECT
        config_json AS configJson,
        updated_at AS updatedAt
      FROM settings_connections
      WHERE id = ?
    `)
    .get("primary") as
    | {
        configJson: string
        updatedAt: string
      }
    | undefined

  if (!row) {
    const updatedAt = new Date().toISOString()

    database
      .prepare(`
        INSERT INTO settings_connections (id, config_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `)
      .run("primary", JSON.stringify(defaultSystemSettings), updatedAt)

    row = database
      .prepare(`
        SELECT
          config_json AS configJson,
          updated_at AS updatedAt
        FROM settings_connections
        WHERE id = ?
      `)
      .get("primary") as
      | {
          configJson: string
          updatedAt: string
        }
      | undefined
  }

  if (!row) {
    throw new Error("System settings are not initialized")
  }

  return row
}

function ensureAppearanceRow(database: SqliteDatabase) {
  let row = database
    .prepare(`
      SELECT
        theme,
        updated_at AS updatedAt
      FROM settings_appearance
      WHERE id = ?
    `)
    .get("primary") as AppearanceSettingsRecord | undefined

  if (!row) {
    const updatedAt = new Date().toISOString()

    database
      .prepare(`
        INSERT INTO settings_appearance (id, theme, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO NOTHING
      `)
      .run("primary", defaultAppearanceSettings.theme, updatedAt)

    row = database
      .prepare(`
        SELECT
          theme,
          updated_at AS updatedAt
        FROM settings_appearance
        WHERE id = ?
      `)
      .get("primary") as AppearanceSettingsRecord | undefined
  }

  if (!row) {
    throw new Error("Appearance settings are not initialized")
  }

  return row
}

function listSettingOptionsByKind(database: SqliteDatabase, kind: SettingsOptionKind) {
  const rows = database
    .prepare(`
      SELECT value
      FROM settings_option_lists
      WHERE kind = ?
      ORDER BY sort_order ASC, value COLLATE NOCASE ASC
    `)
    .all(kind) as Array<{ value: string }>

  return rows.map((row) => row.value)
}

function upsertSettingOptionValue(database: SqliteDatabase, kind: SettingsOptionKind, value: string) {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return
  }

  const existing = database
    .prepare(`
      SELECT 1 AS hasValue
      FROM settings_option_lists
      WHERE kind = ? AND value = ?
    `)
    .get(kind, normalizedValue) as { hasValue: number } | undefined

  if (existing) {
    database
      .prepare(`
        UPDATE settings_option_lists
        SET updated_at = ?
        WHERE kind = ? AND value = ?
      `)
      .run(new Date().toISOString(), kind, normalizedValue)

    return
  }

  const nextSortOrderRow = database
    .prepare(`
      SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSortOrder
      FROM settings_option_lists
      WHERE kind = ?
    `)
    .get(kind) as { nextSortOrder: number }

  database
    .prepare(`
      INSERT INTO settings_option_lists (kind, value, sort_order, updated_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(kind, normalizedValue, nextSortOrderRow.nextSortOrder, new Date().toISOString())
}

function parseRolesJson(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.map((item) => String(item).trim()).filter(Boolean)
  } catch {
    return []
  }
}

export function getProfileSettings() {
  const database = getDatabase()
  return ensureProfileRow(database)
}

export function getProfileSettingsBundle() {
  const database = getDatabase()

  return {
    profile: ensureProfileRow(database),
    options: {
      roles: listSettingOptionsByKind(database, "role"),
      teams: listSettingOptionsByKind(database, "team"),
    },
  } as ProfileSettingsBundleRecord
}

export function getSettingsOptionLists() {
  const database = getDatabase()

  return {
    role: listSettingOptionsByKind(database, "role"),
    team: listSettingOptionsByKind(database, "team"),
    department: listSettingOptionsByKind(database, "department"),
    workAddress: listSettingOptionsByKind(database, "workAddress"),
  } as SettingsOptionListsRecord
}

export function updateProfileSettings(input: Omit<ProfileSettingsRecord, "updatedAt">) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()

  database
    .prepare(`
      INSERT INTO settings_profile (id, full_name, email, role, team, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        full_name = excluded.full_name,
        email = excluded.email,
        role = excluded.role,
        team = excluded.team,
      updated_at = excluded.updated_at
    `)
    .run("primary", input.fullName, input.email, input.role, input.team, updatedAt)

  upsertSettingOptionValue(database, "role", input.role)
  upsertSettingOptionValue(database, "team", input.team)

  return getProfileSettingsBundle()
}

export function replaceSettingsOptionList(kind: SettingsOptionKind, items: string[]) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()
  const normalizedItems = Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
  database
    .prepare(`
      DELETE FROM settings_option_lists
      WHERE kind = ?
    `)
    .run(kind)

  const insertStatement = database.prepare(`
    INSERT INTO settings_option_lists (kind, value, sort_order, updated_at)
    VALUES (?, ?, ?, ?)
  `)

  normalizedItems.forEach((value, index) => {
    insertStatement.run(kind, value, index, updatedAt)
  })

  return {
    kind,
    items: listSettingOptionsByKind(database, kind),
    updatedAt,
  }
}

export function upsertSettingOption(kind: SettingsOptionKind, value: string) {
  const database = getDatabase()
  upsertSettingOptionValue(database, kind, value)

  return {
    kind,
    items: listSettingOptionsByKind(database, kind),
  }
}

export function upsertAuthenticatedUser(
  input: Omit<AuthenticatedUserRecord, "createdAt" | "updatedAt" | "lastLoginAt">,
) {
  const database = getDatabase()
  const now = new Date().toISOString()

  database
    .prepare(`
      INSERT INTO auth_users (
        subject,
        preferred_username,
        full_name,
        email,
        roles_json,
        last_login_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(subject) DO UPDATE SET
        preferred_username = excluded.preferred_username,
        full_name = excluded.full_name,
        email = excluded.email,
        roles_json = excluded.roles_json,
        last_login_at = excluded.last_login_at,
        updated_at = excluded.updated_at
    `)
    .run(
      input.subject,
      input.preferredUsername,
      input.fullName,
      input.email,
      JSON.stringify(input.roles),
      now,
      now,
      now,
    )

  const row = database
    .prepare(`
      SELECT
        subject,
        preferred_username AS preferredUsername,
        full_name AS fullName,
        email,
        roles_json AS rolesJson,
        last_login_at AS lastLoginAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM auth_users
      WHERE subject = ?
    `)
    .get(input.subject) as
    | {
        subject: string
        preferredUsername: string
        fullName: string
        email: string
        rolesJson: string
        lastLoginAt: string
        createdAt: string
        updatedAt: string
      }
    | undefined

  if (!row) {
    throw new Error("Authenticated user was not persisted")
  }

  return {
    subject: row.subject,
    preferredUsername: row.preferredUsername,
    fullName: row.fullName,
    email: row.email,
    roles: parseRolesJson(row.rolesJson),
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  } as AuthenticatedUserRecord
}

export function getSystemSettings() {
  const database = getDatabase()
  const row = ensureSystemRow(database)
  return parseSystemConfig(row.configJson, row.updatedAt)
}

export function getConnectionConfig(
  system: Omit<SystemSettingsRecord, "updatedAt"> | SystemSettingsRecord,
  connector: SystemConnectionKey,
): ConnectionRecord {
  const property = connectionPropertyMap[connector]
  return system[property]
}

export function getSystemConnection(connector: SystemConnectionKey) {
  const system = getSystemSettings()

  return {
    config: getConnectionConfig(system, connector),
    updatedAt: system.updatedAt,
  }
}

export function updateSystemSettings(input: Omit<SystemSettingsRecord, "updatedAt">) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()

  database
    .prepare(`
      INSERT INTO settings_connections (id, config_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `)
    .run("primary", JSON.stringify(input), updatedAt)

  return getSystemSettings()
}

export function updateSystemConnection(connector: SystemConnectionKey, input: ConnectionRecord) {
  const current = getSystemSettings()

  return updateSystemSettings({
    keycloak: connector === "keycloak" ? input as SystemSettingsRecord["keycloak"] : current.keycloak,
    openvpn: connector === "openvpn" ? input as SystemSettingsRecord["openvpn"] : current.openvpn,
    smtp: connector === "smtp" ? input as SystemSettingsRecord["smtp"] : current.smtp,
    smtpWelcome:
      connector === "smtp-welcome" ? input as SystemSettingsRecord["smtpWelcome"] : current.smtpWelcome,
  })
}

export function listNotificationSettings() {
  const database = getDatabase()
  const rows = database
    .prepare(`
      SELECT
        id,
        label,
        description,
        enabled,
        updated_at AS updatedAt
      FROM settings_notifications
      ORDER BY sort_order ASC
    `)
    .all() as Array<{
      id: string
      label: string
      description: string
      enabled: number
      updatedAt: string
    }>

  return rows.map((row) => {
    return {
      ...row,
      enabled: Boolean(row.enabled),
    } as NotificationSettingRecord
  })
}

export function getNotificationSetting(notificationId: string) {
  const database = getDatabase()
  const row = database
    .prepare(`
      SELECT
        id,
        label,
        description,
        enabled,
        updated_at AS updatedAt
      FROM settings_notifications
      WHERE id = ?
    `)
    .get(notificationId) as
    | {
        id: string
        label: string
        description: string
        enabled: number
        updatedAt: string
      }
    | undefined

  if (!row) {
    return null
  }

  return {
    ...row,
    enabled: Boolean(row.enabled),
  } as NotificationSettingRecord
}

export function updateNotificationSetting(
  notificationId: string,
  patch: Partial<Omit<NotificationSettingRecord, "id" | "updatedAt">>,
) {
  const current = getNotificationSetting(notificationId)

  if (!current) {
    return null
  }

  const next = {
    ...current,
    ...patch,
  }

  const database = getDatabase()
  const updatedAt = new Date().toISOString()

  database
    .prepare(`
      UPDATE settings_notifications
      SET
        label = ?,
        description = ?,
        enabled = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(next.label, next.description, next.enabled ? 1 : 0, updatedAt, notificationId)

  return getNotificationSetting(notificationId)
}

export function replaceNotificationSettings(
  items: Array<Omit<NotificationSettingRecord, "updatedAt">>,
) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()
  const updateStatement = database.prepare(`
    UPDATE settings_notifications
    SET
      label = ?,
      description = ?,
      enabled = ?,
      sort_order = ?,
      updated_at = ?
    WHERE id = ?
  `)

  items.forEach((item, index) => {
    updateStatement.run(
      item.label,
      item.description,
      item.enabled ? 1 : 0,
      index,
      updatedAt,
      item.id,
    )
  })

  return listNotificationSettings()
}

export function getAppearanceSettings() {
  const database = getDatabase()
  return ensureAppearanceRow(database)
}

export function updateAppearanceSettings(input: Omit<AppearanceSettingsRecord, "updatedAt">) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()

  database
    .prepare(`
      INSERT INTO settings_appearance (id, theme, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        theme = excluded.theme,
        updated_at = excluded.updated_at
    `)
    .run("primary", input.theme, updatedAt)

  return getAppearanceSettings()
}

export function getSettingsBundle() {
  return {
    notifications: listNotificationSettings(),
    appearance: getAppearanceSettings(),
  } as SettingsBundleRecord
}

function toEmailTemplateRecord(row: {
  id: string
  name: string
  category: string
  subject: string
  description: string
  html: string
  sampleDataJson: string
  updatedAt: string
}): EmailTemplateRecord {
  let sampleData: Record<string, string> = {}

  try {
    const parsed = JSON.parse(row.sampleDataJson) as Record<string, unknown>
    sampleData = Object.fromEntries(
      Object.entries(parsed).map(([key, value]) => [key, typeof value === "string" ? value : String(value)]),
    )
  } catch {
    sampleData = {}
  }

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subject: row.subject,
    description: row.description,
    html: row.html,
    sampleData,
    updatedAt: row.updatedAt,
  }
}

function toAuditLogRecord(row: {
  id: string
  actorName: string
  category: "access" | "edit" | "action"
  action: string
  resourceType: string
  resourceId: string
  resourceName: string
  detail: string
  metadataJson: string
  createdAt: string
}): AuditLogRecord {
  let metadata: Record<string, unknown> = {}

  try {
    metadata = JSON.parse(row.metadataJson) as Record<string, unknown>
  } catch {
    metadata = {}
  }

  return {
    id: row.id,
    actorName: row.actorName,
    category: row.category,
    action: row.action,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    resourceName: row.resourceName,
    detail: row.detail,
    metadata,
    createdAt: row.createdAt,
  }
}

export function listEmailTemplates() {
  const database = getDatabase()
  const rows = database
    .prepare(`
      SELECT
        id,
        name,
        category,
        subject,
        description,
        html_content AS html,
        sample_data_json AS sampleDataJson,
        updated_at AS updatedAt
      FROM email_templates
      ORDER BY name ASC
    `)
    .all() as Array<{
      id: string
      name: string
      category: string
      subject: string
      description: string
      html: string
      sampleDataJson: string
      updatedAt: string
    }>

  return rows.map(toEmailTemplateRecord)
}

export function getEmailTemplate(templateId: string) {
  const database = getDatabase()
  const row = database
    .prepare(`
      SELECT
        id,
        name,
        category,
        subject,
        description,
        html_content AS html,
        sample_data_json AS sampleDataJson,
        updated_at AS updatedAt
      FROM email_templates
      WHERE id = ?
    `)
    .get(templateId) as
    | {
        id: string
        name: string
        category: string
        subject: string
        description: string
        html: string
        sampleDataJson: string
        updatedAt: string
      }
    | undefined

  return row ? toEmailTemplateRecord(row) : null
}

function slugifyTemplateName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function createEmailTemplate(input: Omit<EmailTemplateRecord, "id" | "updatedAt">) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()
  const baseId = slugifyTemplateName(input.name) || "email-template"
  const templateId = `${baseId}-${randomUUID().slice(0, 8)}`

  database
    .prepare(`
      INSERT INTO email_templates (
        id,
        name,
        category,
        subject,
        description,
        html_content,
        sample_data_json,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      templateId,
      input.name,
      input.category,
      input.subject,
      input.description,
      input.html,
      JSON.stringify(input.sampleData),
      updatedAt,
    )

  const created = getEmailTemplate(templateId)

  if (!created) {
    throw new Error("Email template was not created")
  }

  return created
}

export function updateEmailTemplate(templateId: string, input: Omit<EmailTemplateRecord, "id" | "updatedAt">) {
  const database = getDatabase()
  const updatedAt = new Date().toISOString()

  database
    .prepare(`
      UPDATE email_templates
      SET
        name = ?,
        category = ?,
        subject = ?,
        description = ?,
        html_content = ?,
        sample_data_json = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      input.name,
      input.category,
      input.subject,
      input.description,
      input.html,
      JSON.stringify(input.sampleData),
      updatedAt,
      templateId,
    )

  return getEmailTemplate(templateId)
}

export function deleteEmailTemplate(templateId: string) {
  const database = getDatabase()
  const existing = getEmailTemplate(templateId)

  if (!existing) {
    return null
  }

  database
    .prepare(`
      DELETE FROM email_templates
      WHERE id = ?
    `)
    .run(templateId)

  return existing
}

export function appendAuditLog(input: Omit<AuditLogRecord, "id" | "createdAt" | "metadata"> & {
  metadata?: Record<string, unknown>
}) {
  const database = getDatabase()
  const createdAt = new Date().toISOString()

  database
    .prepare(`
      INSERT INTO audit_logs (
        id,
        actor_name,
        category,
        action,
        resource_type,
        resource_id,
        resource_name,
        detail,
        metadata_json,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      randomUUID(),
      input.actorName,
      input.category,
      input.action,
      input.resourceType,
      input.resourceId,
      input.resourceName,
      input.detail,
      JSON.stringify(input.metadata ?? {}),
      createdAt,
    )
}

function buildAuditQueryFilters(options?: Omit<AuditLogFilterOptions, "limit">) {
  const filters: string[] = []
  const params: unknown[] = []

  if (options?.resourceType) {
    filters.push("resource_type = ?")
    params.push(options.resourceType)
  }

  if (options?.resourceId) {
    filters.push("resource_id = ?")
    params.push(options.resourceId)
  }

  if (options?.category) {
    filters.push("category = ?")
    params.push(options.category)
  }

  if (options?.action) {
    filters.push("action = ?")
    params.push(options.action)
  }

  if (options?.search?.trim()) {
    filters.push("(resource_name LIKE ? OR detail LIKE ? OR actor_name LIKE ?)")
    const pattern = `%${options.search.trim()}%`
    params.push(pattern, pattern, pattern)
  }

  return {
    whereClause: filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "",
    params,
  }
}

export function listAuditLogs(options?: AuditLogFilterOptions) {
  const database = getDatabase()
  const { whereClause, params } = buildAuditQueryFilters(options)
  const limit = Math.min(Math.max(options?.limit ?? 24, 1), 200)

  const rows = database
    .prepare(`
      SELECT
        id,
        actor_name AS actorName,
        category,
        action,
        resource_type AS resourceType,
        resource_id AS resourceId,
        resource_name AS resourceName,
        detail,
        metadata_json AS metadataJson,
        created_at AS createdAt
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(...params, limit) as Array<{
      id: string
      actorName: string
      category: "access" | "edit" | "action"
      action: string
      resourceType: string
      resourceId: string
      resourceName: string
      detail: string
      metadataJson: string
      createdAt: string
    }>

  return rows.map(toAuditLogRecord)
}

export function getAuditLogSummary(options?: Omit<AuditLogFilterOptions, "limit">): AuditLogSummaryRecord {
  const database = getDatabase()
  const { whereClause, params } = buildAuditQueryFilters(options)

  const row = database
    .prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN category = 'access' THEN 1 ELSE 0 END) AS accessCount,
        SUM(CASE WHEN category = 'edit' THEN 1 ELSE 0 END) AS editCount,
        SUM(CASE WHEN category = 'action' THEN 1 ELSE 0 END) AS actionCount,
        MAX(created_at) AS latestAt
      FROM audit_logs
      ${whereClause}
    `)
    .get(...params) as {
      total: number
      accessCount: number | null
      editCount: number | null
      actionCount: number | null
      latestAt: string | null
    }

  return {
    total: row.total ?? 0,
    accessCount: row.accessCount ?? 0,
    editCount: row.editCount ?? 0,
    actionCount: row.actionCount ?? 0,
    latestAt: row.latestAt ?? null,
  }
}
