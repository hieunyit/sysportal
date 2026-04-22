import { z } from "zod"

const optionalBooleanOrNull = z.union([z.boolean(), z.null()]).optional()
const trimmedString = z.string().trim()
const optionalTrimmedString = trimmedString.max(255).optional()
const nullableTrimmedString = z.union([trimmedString.max(255), z.null()]).optional()

const ipSubnetSchema = z.object({
  ipv6: z.boolean().optional(),
  netip: trimmedString.min(1).max(160),
  prefix_length: z.coerce.number().int().min(0).max(128),
})

const groupIpRangeSchema = z.object({
  ipv6: z.boolean().optional(),
  first_ip: trimmedString.min(1).max(160),
  last_ip: trimmedString.min(1).max(160),
})

const dmzIpSchema = z.object({
  ip: trimmedString.min(1).max(160),
  protocol: z.enum(["tcp", "udp", "icmp"]).optional(),
  start_port: z.coerce.number().int().min(1).max(65_535).optional(),
  end_port: z.coerce.number().int().min(1).max(65_535).optional(),
})

const portRangeServiceSchema = z.object({
  protocol: z.enum(["tcp", "udp"]),
  start_port: z.coerce.number().int().min(1).max(65_535),
  end_port: z.coerce.number().int().min(1).max(65_535).optional(),
})

const icmpServiceSchema = z.object({
  protocol: z.literal("icmp"),
  type: trimmedString.min(1).max(120),
})

const ipServiceSchema = z.union([portRangeServiceSchema, icmpServiceSchema])

const accessRouteSubnetSchema = ipSubnetSchema.extend({
  service: z.array(ipServiceSchema).optional(),
})

export const openVpnUserBaseSchema = z.object({
  name: trimmedString.min(1).max(160),
  deny: optionalBooleanOrNull,
  deny_web: optionalBooleanOrNull,
  admin: optionalBooleanOrNull,
  autologin: optionalBooleanOrNull,
  auth_method: nullableTrimmedString,
  cc_commands: z.union([z.string(), z.null()]).optional(),
  totp: optionalBooleanOrNull,
  password_strength: optionalBooleanOrNull,
  allow_password_change: optionalBooleanOrNull,
  reroute_gw: z.union([trimmedString.max(120), z.null()]).optional(),
  allow_generate_profiles: optionalBooleanOrNull,
  bypass_subnets: z.union([z.array(ipSubnetSchema), z.null()]).optional(),
  group: nullableTrimmedString,
  static_ipv4: nullableTrimmedString,
  static_ipv6: nullableTrimmedString,
  dmz_ip: z.union([z.array(dmzIpSchema), z.null()]).optional(),
  dmz_ipv6: z.union([z.array(dmzIpSchema), z.null()]).optional(),
  compile: optionalBooleanOrNull,
  totp_admin_only: optionalBooleanOrNull,
  client_to_server_subnets: z.union([z.array(ipSubnetSchema), z.null()]).optional(),
})

export const openVpnGroupBaseSchema = z.object({
  name: trimmedString.min(1).max(160),
  deny: optionalBooleanOrNull,
  deny_web: optionalBooleanOrNull,
  admin: optionalBooleanOrNull,
  autologin: optionalBooleanOrNull,
  auth_method: nullableTrimmedString,
  cc_commands: z.union([z.string(), z.null()]).optional(),
  totp: optionalBooleanOrNull,
  password_strength: optionalBooleanOrNull,
  allow_password_change: optionalBooleanOrNull,
  reroute_gw: z.union([trimmedString.max(120), z.null()]).optional(),
  allow_generate_profiles: optionalBooleanOrNull,
  bypass_subnets: z.union([z.array(ipSubnetSchema), z.null()]).optional(),
  members: z.union([z.array(trimmedString.min(1).max(160)), z.null()]).optional(),
  subnets: z.union([z.array(ipSubnetSchema), z.null()]).optional(),
  dynamic_ranges: z.union([z.array(groupIpRangeSchema), z.null()]).optional(),
})

export const openVpnUserCreateSchema = openVpnUserBaseSchema
export const openVpnUserPatchSchema = openVpnUserBaseSchema.partial().extend({
  name: trimmedString.min(1).max(160),
})

export const openVpnGroupCreateSchema = openVpnGroupBaseSchema
export const openVpnGroupPatchSchema = openVpnGroupBaseSchema.partial().extend({
  name: trimmedString.min(1).max(160),
})

export const openVpnAccessListTypeSchema = z.enum([
  "access_from_ipv6",
  "access_from_ipv4",
  "access_to_ipv4",
  "access_to_ipv6",
])

export const openVpnAccessRouteSchema = z.object({
  type: z.enum(["user", "group", "route", "nat", "all", "all_vpn_clients", "all_s2c_subnets"]),
  accept: z.boolean().optional(),
  username: optionalTrimmedString,
  groupname: optionalTrimmedString,
  subnet: accessRouteSubnetSchema.optional(),
}).superRefine((value, context) => {
  if (value.type === "user" && !value.username?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["username"],
      message: "Username is required when the route type is user",
    })
  }

  if (value.type === "group" && !value.groupname?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["groupname"],
      message: "Group name is required when the route type is group",
    })
  }

  if ((value.type === "route" || value.type === "nat") && !value.subnet) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["subnet"],
      message: "Subnet is required when the route type is route or nat",
    })
  }
})

export const openVpnAccessListReplaceSchema = z.object({
  routes: z.array(openVpnAccessRouteSchema),
})

export const openVpnRulesetCreateSchema = z.object({
  name: trimmedString.min(1).max(160),
  comment: trimmedString.max(320),
  position: z.coerce.number().int().min(0).max(100_000).optional(),
})

export const openVpnRulesetUpdateSchema = z.object({
  name: trimmedString.min(1).max(160),
  comment: trimmedString.max(320),
})

export const openVpnRuleSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  ruleset_id: z.coerce.number().int().positive(),
  type: z.enum(["domain_routing", "filter"]),
  match_type: z.enum([
    "domain",
    "not_domain",
    "subdomain",
    "not_subdomain",
    "domain_or_subdomain",
    "not_domain_or_subdomain",
  ]),
  match_data: trimmedString.min(1).max(255),
  action: z.enum(["route", "nat", "deny", "bypass"]),
  position: z.coerce.number().int().min(0).max(100_000),
  comment: trimmedString.max(320),
})

export const openVpnRulesReplaceSchema = z.object({
  rules: z.array(openVpnRuleSchema),
})

export function formatOpenVpnZodError(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }))
}

export function compactObject<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}
