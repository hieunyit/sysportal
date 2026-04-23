export const dashboardSummaryCards = [
  {
    title: "Managed identities",
    value: "12,480",
    detail: "+184 over the last 7 days",
    icon: "key",
  },
  {
    title: "Active VPN sessions",
    value: "428",
    detail: "97% policy compliant",
    icon: "network",
  },
  {
    title: "Pending approvals",
    value: "36",
    detail: "8 high-priority requests",
    icon: "shield",
  },
  {
    title: "Active alerts",
    value: "5",
    detail: "2 delayed sync jobs",
    icon: "alert",
  },
] as const

export const dashboardHero = {
  badge: "Control Plane",
  title: "Identity and access control center",
  description:
    "Monitor connector health, identity synchronization, approval queues, and operational risk across Keycloak, OpenVPN, Jira, ServiceDesk, and connected internal systems.",
  shift: {
    label: "Current shift",
    value: "IAM Ops - Shift A",
    detail: "2 primary admins, 1 backup admin, 1 approval owner",
  },
  sla: {
    label: "SLA target",
    value: "92% under 2 hours",
    detail: "Currently at 89%, 4 requests need acceleration",
  },
  release: {
    label: "Next change window",
    value: "20:30 tonight",
    detail: "Role synchronization batch from ServiceDesk to Jira",
  },
} as const

export const systems = [
  {
    id: "keycloak",
    name: "Keycloak",
    owner: "IAM Team",
    status: "Healthy",
    sync: "2 minutes ago",
    workload: "14 open requests",
  },
  {
    id: "openvpn",
    name: "OpenVPN",
    owner: "Infrastructure Operations",
    status: "Monitoring",
    sync: "8 minutes ago",
    workload: "6 certificates expiring soon",
  },
  {
    id: "jira",
    name: "Jira",
    owner: "Atlassian Administration",
    status: "Healthy",
    sync: "1 minute ago",
    workload: "11 onboarding changes",
  },
  {
    id: "servicedesk",
    name: "ServiceDesk",
    owner: "ITSM Team",
    status: "Needs attention",
    sync: "12 minutes ago",
    workload: "9 routed tickets waiting on level 2",
  },
  {
    id: "hr-directory",
    name: "HR Directory Sync",
    owner: "People Systems",
    status: "Healthy",
    sync: "5 minutes ago",
    workload: "0 data mismatches",
  },
] as const

export const policyChecks = [
  { label: "Mandatory MFA for privileged groups", value: 96 },
  { label: "Quarterly privileged access reviews", value: 82 },
  { label: "HR to IAM sync completeness", value: 91 },
] as const

export const alertFeed = [
  {
    title: "ServiceDesk approval queue is rising",
    detail: "9 tickets have been stalled at the second approval step for the last 30 minutes.",
    severity: "High",
  },
  {
    title: "OpenVPN vendor certificates are close to expiry",
    detail: "6 external accounts require renewal before 2026-04-23.",
    severity: "Medium",
  },
  {
    title: "Jira FIN-ADMIN scope was expanded",
    detail: "The platform recorded a scope change affecting 3 users.",
    severity: "Info",
  },
] as const

export const activityItems = [
  { title: "Keycloak synchronized with HR directory", meta: "98 of 98 records processed successfully", time: "09:42" },
  { title: "OpenVPN revoked 2 legacy certificates", meta: "Triggered by offboarding workflow", time: "09:17" },
  { title: "Jira project access review completed", meta: "7 role assignments standardized", time: "08:55" },
  { title: "ServiceDesk auto-closed stale tickets", meta: "4 non-impacting tickets removed from queue", time: "08:21" },
] as const

export const approvalQueue = [
  {
    id: "req-1001",
    requester: "Nguyen Huy",
    request: "Grant Jira project admin access for FIN-ERP",
    system: "Jira",
    sla: "34 minutes",
    priority: "High",
  },
  {
    id: "req-1002",
    requester: "Tran Linh",
    request: "Enable branch-level VPN access for HCMC operations",
    system: "OpenVPN",
    sla: "1 hour 12 minutes",
    priority: "Medium",
  },
  {
    id: "req-1003",
    requester: "Pham Khoa",
    request: "Unlock a suspended Keycloak account after MFA reset",
    system: "Keycloak",
    sla: "18 minutes",
    priority: "High",
  },
  {
    id: "req-1004",
    requester: "ServiceBot",
    request: "Re-run ServiceDesk to Keycloak role sync",
    system: "ServiceDesk",
    sla: "2 hours 05 minutes",
    priority: "Low",
  },
] as const

export const todayOperations = [
  { time: "10:00", title: "Review FIN privileged group membership", detail: "Jira and Keycloak" },
  { time: "14:30", title: "Run offboarding synchronization", detail: "ServiceDesk to IAM" },
  { time: "17:00", title: "Inspect vendor VPN certificate backlog", detail: "OpenVPN" },
  { time: "20:30", title: "Execute Jira role mapping batch", detail: "Jira project sync" },
] as const

export const controlGaps = [
  {
    title: "Inactive accounts over 45 days",
    value: "27",
    icon: "users",
  },
  {
    title: "Roles due for review this week",
    value: "11",
    icon: "badge",
  },
  {
    title: "Mappings pending org change updates",
    value: "8",
    icon: "key",
  },
] as const

export const analyticsMetrics = [
  { title: "Audit pass rate", value: "94.8%", detail: "+2.1% versus last month", icon: "check" },
  { title: "Access anomalies", value: "7", detail: "3 items need immediate review", icon: "alert" },
  { title: "Average approval time", value: "1.7h", detail: "Target remains under 2h", icon: "clock" },
  { title: "Policies auto-enforced", value: "28", detail: "Rules applied in the last 24h", icon: "shield" },
] as const

export const systemScores = [
  { system: "Keycloak", score: 98, note: "Role sync and MFA coverage are stable" },
  { system: "OpenVPN", score: 91, note: "6 vendor certificates still need renewal" },
  { system: "Jira", score: 96, note: "Approval routing remains complete" },
  { system: "ServiceDesk", score: 88, note: "2 queues remain blocked at level 2 approval" },
  { system: "HR Directory", score: 95, note: "Personnel data is arriving on cadence" },
] as const

export const governanceReviews = [
  {
    title: "Privileged groups due for review",
    owner: "IAM Governance",
    value: "11 groups",
    severity: "High",
  },
  {
    title: "Orphaned accounts after offboarding",
    owner: "Identity Lifecycle",
    value: "4 accounts",
    severity: "High",
  },
  {
    title: "Manual entitlements missing mappings",
    owner: "Application Owners",
    value: "18 entitlements",
    severity: "Medium",
  },
] as const

export const analyticsInsights = [
  {
    title: "Ticket handling time is down",
    detail: "ServiceDesk moved from 2.6 hours to 1.9 hours after automated routing for VPN access requests.",
  },
  {
    title: "Manual role grants still need cleanup",
    detail: "Jira and Keycloak still hold 18 manually assigned roles that should be converted into governed access bundles.",
  },
  {
    title: "HR synchronization is more stable",
    detail: "Mismatch rates between HR Directory and IAM fell to 0.8%, reducing account recovery tickets.",
  },
] as const

export const accessRequests = [
  {
    id: "req-1001",
    title: "Grant Jira project admin access for FIN-ERP",
    requester: "Nguyen Huy",
    system: "Jira",
    status: "Pending approval",
    dueDate: "2026-04-20 10:45",
    tag: "Privileged",
  },
  {
    id: "req-1002",
    title: "Enable VPN access for datacenter vendor staff",
    requester: "Tran Linh",
    system: "OpenVPN",
    status: "Needs input",
    dueDate: "2026-04-20 13:00",
    tag: "Vendor",
  },
  {
    id: "req-1003",
    title: "Restore a Keycloak account after MFA reset",
    requester: "Pham Khoa",
    system: "Keycloak",
    status: "Pending approval",
    dueDate: "2026-04-20 09:55",
    tag: "Break-fix",
  },
  {
    id: "req-1004",
    title: "Grant ServiceDesk support role for night shift",
    requester: "ITSM Bot",
    system: "ServiceDesk",
    status: "Completed",
    dueDate: "2026-04-19 18:30",
    tag: "Automation",
  },
  {
    id: "req-1005",
    title: "Map HR-ONBOARDING group into Jira onboarding project",
    requester: "People Systems",
    system: "Jira",
    status: "Pending approval",
    dueDate: "2026-04-20 15:15",
    tag: "Joiner",
  },
] as const

export const changeWindows = [
  {
    id: "chg-2001",
    date: "2026-04-20",
    time: "20:30 - 21:15",
    title: "Batch role synchronization from ServiceDesk into Jira",
    impact: "Low risk",
  },
  {
    id: "chg-2002",
    date: "2026-04-21",
    time: "06:00 - 06:20",
    title: "Rotate OpenVPN vendor certificates",
    impact: "Notification required",
  },
  {
    id: "chg-2003",
    date: "2026-04-22",
    time: "18:00 - 18:45",
    title: "Review Keycloak realm mapping for Finance",
    impact: "Medium risk",
  },
] as const

export const changeAgenda = [
  { time: "10:00", title: "Review privileged FIN roles", owner: "IAM Governance" },
  { time: "14:30", title: "Run HR offboarding sync into IAM", owner: "Identity Lifecycle" },
  { time: "17:00", title: "Inspect vendor VPN queue", owner: "Infrastructure Operations" },
] as const

export const changePolicies = [
  {
    title: "Access change window policy",
    detail: "Privileged access changes only ship after 18:00 and require a documented rollback plan.",
  },
  {
    title: "Payroll freeze period",
    detail: "Keycloak Finance and Jira FIN mappings must remain unchanged from day 25 through day 28 each month.",
  },
  {
    title: "Certificate rotation notice",
    detail: "Every vendor VPN certificate rotation requires 24-hour notice and a rollback contact list.",
  },
] as const

export const teamMembers = [
  {
    id: "tm-1",
    name: "Nguyen Bao An",
    role: "IAM Lead",
    systems: "Keycloak, HR Sync",
    status: "On call",
    queue: "14 open requests",
    avatar: "/avatars/avatar-1.jpg",
    initials: "NA",
  },
  {
    id: "tm-2",
    name: "Tran Minh Duc",
    role: "VPN Administrator",
    systems: "OpenVPN, Certificates",
    status: "Available",
    queue: "6 certificates pending rotation",
    avatar: "/avatars/avatar-2.jpg",
    initials: "TD",
  },
  {
    id: "tm-3",
    name: "Pham Thu Ha",
    role: "Atlassian Admin",
    systems: "Jira, ServiceDesk",
    status: "Reviewing",
    queue: "9 routed tickets waiting on decision",
    avatar: "/avatars/avatar-3.jpg",
    initials: "PH",
  },
  {
    id: "tm-4",
    name: "Le Gia Khanh",
    role: "Access Governance",
    systems: "Privileged Review",
    status: "Available",
    queue: "11 groups due for review",
    avatar: "/avatars/avatar-4.jpg",
    initials: "LK",
  },
] as const

export const systemSettings = {
  keycloak: {
    serverUrl: "https://sso.example.com",
    realm: "master",
    clientId: "identityops-admin",
    clientSecret: "",
    ldapProviderId: "",
    verifyTls: true,
    timeoutSeconds: 15,
  },
  openvpn: {
    serverUrl: "https://vpn.example.com",
    apiBasePath: "/api",
    username: "openvpn-api",
    password: "",
    nodeName: "",
    verifyTls: true,
    timeoutSeconds: 15,
  },
  smtp: {
    host: "smtp.example.com",
    port: 587,
    username: "identityops-notify",
    password: "",
    fromAddress: "identityops@example.com",
    fromName: "IdentityOps Notifications",
    tlsMode: "starttls",
    insecureSkipVerify: false,
    requireAuth: true,
  },
  smtpWelcome: {
    host: "smtp.example.com",
    port: 587,
    username: "onboarding-welcome",
    password: "",
    fromAddress: "welcome@example.com",
    fromName: "People Operations Welcome",
    tlsMode: "starttls",
    insecureSkipVerify: false,
    requireAuth: true,
  },
} as const

export const emailTemplates = [
  {
    id: "access-approval-notification",
    name: "Access Approval Notification",
    category: "notification",
    subject: "Access Approved: {{requestId}} for {{systemName}}",
    description: "Operational approval email sent after privileged or standard access is granted.",
    html: `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Access Approval</title>
  </head>
  <body style="margin:0;padding:0;background:#eef4f8;font-family:Inter,Segoe UI,Arial,sans-serif;color:#102a43;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef4f8;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:#ffffff;border:1px solid #d7e2ec;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 36px;background:linear-gradient(135deg,#0f766e,#0f4c81);color:#f8fbff;">
                <p style="margin:0 0 10px 0;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.82;">IdentityOps Notification</p>
                <h1 style="margin:0;font-size:28px;line-height:1.2;">Access request approved</h1>
                <p style="margin:14px 0 0 0;font-size:15px;line-height:1.6;opacity:0.9;">{{recipientName}}, your request {{requestId}} has been approved and is ready for use.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px 36px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0 12px;">
                  <tr>
                    <td style="padding:16px 18px;background:#f8fbfd;border:1px solid #d7e2ec;border-radius:16px;">
                      <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#486581;">System</p>
                      <p style="margin:0;font-size:16px;font-weight:700;color:#102a43;">{{systemName}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;background:#f8fbfd;border:1px solid #d7e2ec;border-radius:16px;">
                      <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#486581;">Access Scope</p>
                      <p style="margin:0;font-size:16px;font-weight:700;color:#102a43;">{{accessScope}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;background:#f8fbfd;border:1px solid #d7e2ec;border-radius:16px;">
                      <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#486581;">Approved By</p>
                      <p style="margin:0;font-size:16px;font-weight:700;color:#102a43;">{{approvedBy}}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:16px 18px;background:#f8fbfd;border:1px solid #d7e2ec;border-radius:16px;">
                      <p style="margin:0 0 6px 0;font-size:12px;text-transform:uppercase;letter-spacing:0.12em;color:#486581;">Effective Until</p>
                      <p style="margin:0;font-size:16px;font-weight:700;color:#102a43;">{{effectiveUntil}}</p>
                    </td>
                  </tr>
                </table>
                <p style="margin:28px 0 0 0;font-size:15px;line-height:1.7;color:#334e68;">If you are unable to sign in or the entitlement does not appear within the expected propagation window, reopen the ticket from the control plane.</p>
                <p style="margin:28px 0 0 0;">
                  <a href="{{helpDeskUrl}}" style="display:inline-block;padding:14px 22px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:700;">Open service ticket</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 36px;border-top:1px solid #d7e2ec;background:#f8fbfd;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#627d98;">This message was generated by IdentityOps Hub. Do not reply directly to this mailbox.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`.trim(),
    sampleData: {
      recipientName: "Nguyen Minh Anh",
      requestId: "REQ-10428",
      systemName: "Keycloak Finance Realm",
      accessScope: "Finance Approver Bundle",
      approvedBy: "Le Gia Khanh",
      effectiveUntil: "June 30, 2026",
      helpDeskUrl: "https://servicedesk.example.com/tickets/REQ-10428",
    },
  },
  {
    id: "new-joiner-welcome",
    name: "New Joiner Welcome",
    category: "welcome",
    subject: "[MobiFone Solutions] Thư chào mừng nhân sự mới - {{.RecipientName}}",
    description: "Welcome email for new employees with account details, onboarding instructions, and internal links.",
    html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thư chào mừng nhân sự mới</title>
</head>
<body style="margin:0; padding:0; background:#edf4fb; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#edf4fb; padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px; background:#ffffff; border:1px solid #d7e0ea; border-radius:22px; overflow:hidden; box-shadow:0 18px 42px rgba(15,23,42,0.09);">
          <tr>
            <td style="height:6px; background:linear-gradient(90deg,#005baa 0%,#0a77c9 35%,#ef3340 100%);"></td>
          </tr>
          <tr>
            <td style="padding:34px 38px 14px; background:linear-gradient(180deg,#f8fbff 0%,#eef6ff 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 18px;">
                    <img src="https://mobifonesolutions.vn/images/mbfs-logo.svg" alt="MobiFone Solutions" width="210" style="display:block; width:210px; max-width:100%; height:auto; border:0;" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:38px; line-height:1.18; font-weight:700; color:#0f172a; text-transform:uppercase;">
                      Chào mừng bạn gia nhập<br />MobiFone Solutions
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:18px;">
                    <p style="margin:0 0 8px; font-size:15px; line-height:1.8; color:#334155;">
                      Thân gửi <strong>{{.RecipientName}}</strong>,
                    </p>
                    <p style="margin:0; font-size:15px; line-height:1.8; color:#475569;">
                      Phòng Nhân sự MobiFone Solutions gửi bạn một số thông tin cần thiết để việc tiếp nhận công việc được diễn ra thuận lợi hơn.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 38px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:24px 26px 10px; font-size:18px; font-weight:700; color:#0f2747;">
                    Thông tin nhân sự
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 26px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d; width:180px;">Họ tên</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.RecipientName}}</td>
                      </tr>
                      {{if .EmployeeID}}
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Mã nhân viên</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.EmployeeID}}</td>
                      </tr>
                      {{end}}
                      {{if .Department}}
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Đơn vị làm việc</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.Department}}</td>
                      </tr>
                      {{end}}
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Ngày làm việc</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{if .OnboardDate}}{{.OnboardDate}}{{else}}Chưa cập nhật{{end}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Địa chỉ làm việc</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{if .WorkAddress}}{{.WorkAddress}}{{else}}Chưa cập nhật{{end}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Webmail</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.WebmailURL}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Tài khoản</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.Email}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 0; font-size:14px; color:#60758d;">Mật khẩu tạm thời</td>
                        <td style="padding:14px 0 0; text-align:right;">
                          <span style="display:inline-block; padding:9px 14px; border-radius:12px; background:#eef6ff; border:1px solid #bfdbfe; color:#0f2747; font-size:15px; font-weight:700;">{{.TemporaryPassword}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 18px; font-size:14px; line-height:1.8; color:#475569;">
                    CBNV sử dụng Outlook để đăng nhập và làm việc. Trước khi đăng nhập, vui lòng thực hiện đổi mật khẩu lần đầu theo liên kết bên dưới. Sau khi đổi mật khẩu, vui lòng chờ khoảng 15 phút trước khi đăng nhập.
                    <a href="https://docs.google.com/" style="color:#005baa; font-weight:700; text-decoration:none;">Hướng dẫn đổi mật khẩu lần đầu</a>
                  </td>
                </tr>
                <tr>
                  <td align="right">
                    <a href="{{.LoginURL}}" target="_blank" style="display:inline-block; padding:15px 28px; border-radius:16px; background:#0f67b6; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; box-shadow:0 14px 28px rgba(15,103,182,0.22);">
                      Đổi mật khẩu lần đầu
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px; font-size:16px; font-weight:700; color:#0f2747;">2. Hướng dẫn chấm công</p>
                    <p style="margin:0; font-size:14px; line-height:1.8; color:#475569;">
                      Công ty chấm công hàng ngày bằng dấu vân tay, liên hệ Bạn Kim Anh (SĐT: 0932325002) - HR để được hướng dẫn và lấy vân tay vào ngày đầu tiên nhận việc.
                      Bạn vui lòng truy cập theo liên kết dưới đây để tìm hiểu quy định về việc chấm công và thời gian làm việc:
                      <a href="https://docs.google.com/presentation/d/1xxXMH4x6WtWAuUWsx_yzqcuH-KOnuZ_Q/edit?usp=sharing&ouid=105385022314024876290&rtpof=true&sd=true" style="color:#005baa; font-weight:700; text-decoration:none;">Xem tại đây</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px; font-size:16px; font-weight:700; color:#0f2747;">3. Gửi xe</p>
                    <p style="margin:0; font-size:14px; line-height:1.8; color:#475569;">
                      Vui lòng liên hệ Chị Phương (SĐT: 0904822618) - Phòng Hành chính để được hướng dẫn và đăng ký gửi xe.
                      <a href="https://docs.google.com/spreadsheets/d/1AGOMX4nqfaZaFRiOZ8wO3yFBSTbWzn5lKUGLLJOPFoA/edit?gid=0#gid=0" style="color:#005baa; font-weight:700; text-decoration:none;">Xem tại đây</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px; font-size:16px; font-weight:700; color:#0f2747;">4. Kênh thông tin nội bộ</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top" style="padding:0 18px 0 0; font-size:14px; line-height:1.8; color:#475569;">
                          Phòng Nhân sự hoặc đơn vị quản lý sẽ mời bạn tham gia kênh trao đổi thông tin nội bộ vào ngày đầu tiên nhận việc.<br /><br />
                          Bạn có thể quét mã QR bên cạnh để tham gia nhóm Zalo, hoặc truy cập trực tiếp theo liên kết sau:
                          <a href="https://zalo.me/g/yjndoy063" style="color:#005baa; font-weight:700; text-decoration:none;">https://zalo.me/g/yjndoy063</a>
                        </td>
                        <td valign="top" align="center" style="width:170px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:170px; background:#ffffff; border:1px solid #d8e7f6; border-radius:16px;">
                            <tr>
                              <td align="center" style="padding:12px 12px 8px;">
                                <a href="https://zalo.me/g/yjndoy063" target="_blank" style="text-decoration:none;">
                                  <img src="https://quickchart.io/qr?text=https%3A%2F%2Fzalo.me%2Fg%2Fyjndoy063&size=180" alt="Mã QR tham gia nhóm Zalo" width="132" style="display:block; width:132px; height:132px; border:0;" />
                                </a>
                              </td>
                            </tr>
                            <tr>
                              <td align="center" style="padding:0 12px 12px; font-size:12px; line-height:1.6; color:#60758d;">
                                Quét mã QR để tham gia nhóm Zalo
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px; font-size:16px; font-weight:700; color:#0f2747;">5. Thiết bị làm việc</p>
                    <p style="margin:0; font-size:14px; line-height:1.8; color:#475569;">
                      Bạn vui lòng chuẩn bị laptop cá nhân để sử dụng trước khi Phòng Hành chính cấp phát trang thiết bị làm việc.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 10px; font-size:16px; font-weight:700; color:#0f2747;">6. Hồ sơ cần chuẩn bị</p>
                    <p style="margin:0 0 10px; font-size:14px; line-height:1.8; color:#475569;">Bạn vui lòng chuẩn bị bộ hồ sơ nộp tại phòng HR trong 1-2 tuần đầu nhận việc:</p>
                    <p style="margin:0; font-size:14px; line-height:1.8; color:#475569;">
                      - Sơ yếu lý lịch có xác nhận của địa phương trong vòng 6 tháng<br />
                      - Bản sao có công chứng CCCD<br />
                      - Bản sao có công chứng bằng tốt nghiệp, chứng chỉ liên quan<br />
                      - Giấy khám sức khỏe còn hiệu lực trong vòng 6 tháng<br />
                      - Ảnh chụp thông tin cư trú trên VNeID
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 38px 14px; background:radial-gradient(circle at top right,#dbeafe 0%,#eff6ff 35%,#ffffff 75%); border-top:1px solid #d8e7f6;">
              <p style="margin:0 0 8px; font-size:15px; line-height:1.8; color:#334155;">Trân trọng,</p>
              <p style="margin:0; font-size:15px; line-height:1.8; font-weight:700; color:#0f2747;">Công ty Cổ phần Giải pháp Số MobiFone(MobiFone Solutions)</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 38px 22px; background:radial-gradient(circle at top right,#dbeafe 0%,#eff6ff 35%,#ffffff 75%); border-top:1px solid #d8e7f6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:14px; line-height:1.8; color:#36506e; text-align:left;">Số 38 Phố Phan Đình Phùng, Phường Ba Đình, TP Hà Nội</td>
                </tr>
                <tr>
                  <td style="font-size:14px; line-height:1.8; color:#36506e; text-align:left;">hr@mobifonesolutions.vn | 0932325002</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    sampleData: {
      RecipientName: "Nguyen Van A",
      EmployeeID: "12345",
      Department: "Văn phòng",
      OnboardDate: "22/04/2026",
      WorkAddress: "Tầng 8, Tòa nhà MobiFone, Hà Nội",
      WebmailURL: "https://outlook.office.com/mail/",
      Email: "nguyenvana@mobifonesolutions.vn",
      TemporaryPassword: "TempPass@123",
      LoginURL: "https://sso.mobifonesolutions.vn/",
    },
  },
  {
    id: "account-notification",
    name: "Account Granted Notification",
    category: "notification",
    subject: "[MobiFone Solutions] Tài khoản của bạn đã được cấp - {{.RecipientName}}",
    description: "Account granted notification email for non-employee users with login credentials and access information.",
    html: `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Thông báo cấp tài khoản</title>
</head>
<body style="margin:0; padding:0; background:#edf4fb; font-family:Arial, Helvetica, sans-serif; color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#edf4fb; padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:760px; background:#ffffff; border:1px solid #d7e0ea; border-radius:22px; overflow:hidden; box-shadow:0 18px 42px rgba(15,23,42,0.09);">
          <tr>
            <td style="height:6px; background:linear-gradient(90deg,#005baa 0%,#0a77c9 35%,#ef3340 100%);"></td>
          </tr>
          <tr>
            <td style="padding:34px 38px 14px; background:linear-gradient(180deg,#f8fbff 0%,#eef6ff 100%);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 18px;">
                    <img src="https://mobifonesolutions.vn/images/mbfs-logo.svg" alt="MobiFone Solutions" width="210" style="display:block; width:210px; max-width:100%; height:auto; border:0;" />
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:38px; line-height:1.18; font-weight:700; color:#0f172a; text-transform:uppercase;">
                      Tài khoản của bạn<br />đã được cấp
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:18px;">
                    <p style="margin:0 0 8px; font-size:15px; line-height:1.8; color:#334155;">
                      Thân gửi <strong>{{.RecipientName}}</strong>,
                    </p>
                    <p style="margin:0; font-size:15px; line-height:1.8; color:#475569;">
                      Tài khoản hệ thống của bạn đã được tạo. Dưới đây là thông tin đăng nhập và hướng dẫn truy cập.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:10px 38px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f7fbff; border:1px solid #d8e7f6; border-radius:18px;">
                <tr>
                  <td style="padding:24px 26px 10px; font-size:18px; font-weight:700; color:#0f2747;">
                    Thông tin tài khoản
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 26px 22px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d; width:180px;">Họ tên</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.RecipientName}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:14px; color:#60758d;">Email</td>
                        <td style="padding:14px 0; border-bottom:1px solid #dce9f7; font-size:15px; font-weight:700; color:#0f172a; text-align:right;">{{.Email}}</td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 0; font-size:14px; color:#60758d;">Mật khẩu tạm thời</td>
                        <td style="padding:14px 0 0; text-align:right;">
                          <span style="display:inline-block; padding:9px 14px; border-radius:12px; background:#eef6ff; border:1px solid #bfdbfe; color:#0f2747; font-size:15px; font-weight:700;">{{.TemporaryPassword}}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 38px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding:0 0 18px; font-size:14px; line-height:1.8; color:#475569;">
                    Vui lòng đăng nhập và thay đổi mật khẩu của bạn tại lần truy cập đầu tiên. Bạn sẽ được chuyển hướng đến trang đổi mật khẩu tự động.
                  </td>
                </tr>
                <tr>
                  <td align="right">
                    <a href="{{.LoginURL}}" target="_blank" style="display:inline-block; padding:15px 28px; border-radius:16px; background:#0f67b6; color:#ffffff; text-decoration:none; font-size:15px; font-weight:700; box-shadow:0 14px 28px rgba(15,103,182,0.22);">
                      Đăng nhập ngay
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:24px 38px 14px; background:radial-gradient(circle at top right,#dbeafe 0%,#eff6ff 35%,#ffffff 75%); border-top:1px solid #d8e7f6;">
              <p style="margin:0 0 8px; font-size:15px; line-height:1.8; color:#334155;">Trân trọng,</p>
              <p style="margin:0; font-size:15px; line-height:1.8; font-weight:700; color:#0f2747;">Công ty Cổ phần Giải pháp Số MobiFone(MobiFone Solutions)</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 38px 22px; background:radial-gradient(circle at top right,#dbeafe 0%,#eff6ff 35%,#ffffff 75%); border-top:1px solid #d8e7f6;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-size:14px; line-height:1.8; color:#36506e; text-align:left;">Số 38 Phố Phan Đình Phùng, Phường Ba Đình, TP Hà Nội</td>
                </tr>
                <tr>
                  <td style="font-size:14px; line-height:1.8; color:#36506e; text-align:left;">hr@mobifonesolutions.vn | 0932325002</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    sampleData: {
      RecipientName: "Nguyen Van A",
      Email: "nguyenvana@mobifonesolutions.vn",
      TemporaryPassword: "TempPass@123",
      LoginURL: "https://sso.mobifonesolutions.vn/",
    },
  },
] as const

export const settingsProfile = {
  fullName: "Identity Admin",
  email: "iam.ops@company.local",
  role: "Identity Operations Lead",
  team: "Identity and Access Operations",
} as const

export const notificationSettings = [
  {
    id: "pref-1",
    label: "Privileged access alerts",
    description: "Notify on admin access, break-glass events, and sensitive role changes.",
    enabled: true,
  },
  {
    id: "pref-2",
    label: "Identity sync failures",
    description: "Notify when HR Sync, Keycloak sync, or role mapping jobs fail.",
    enabled: true,
  },
  {
    id: "pref-3",
    label: "Expiring VPN certificates",
    description: "Remind operations 72 hours before vendor and external certificates expire.",
    enabled: false,
  },
] as const

export const settingsAppearance = {
  theme: "dark",
} as const

export const helpCategories = [
  {
    icon: "book",
    title: "IAM runbooks",
    description: "Guides for access grants, revocations, MFA reset, and break-glass account handling.",
  },
  {
    icon: "shield",
    title: "Approval standards",
    description: "Ownership and approval rules for privileged groups and governed access packages.",
  },
  {
    icon: "message",
    title: "Escalation channels",
    description: "Fast-response routes for VPN, Jira, ServiceDesk, and identity sync incidents.",
  },
  {
    icon: "mail",
    title: "System owner directory",
    description: "Owner contacts and operations groups for every managed platform.",
  },
] as const

export const helpFaqs = [
  {
    question: "When should a break-glass account be opened?",
    answer:
      "Only when standard approval cannot meet operational SLA and an active incident requires immediate access, with logging and level-2 approval captured.",
  },
  {
    question: "How long can a vendor OpenVPN account remain active?",
    answer:
      "The default maximum is 30 days. Anything longer requires a renewed owner and security approval.",
  },
  {
    question: "What should I check when Jira role sync from ServiceDesk is delayed?",
    answer:
      "Review routing queues, workflow mapping, webhook retries, and then compare them against the control-plane synchronization logs.",
  },
  {
    question: "How quickly should access be revoked after offboarding?",
    answer:
      "The target is within 2 hours for privileged access and within 24 hours for standard entitlements if no blocking issue exists.",
  },
] as const

export const platformCatalog = [
  {
    id: "keycloak",
    name: "Keycloak",
    owner: "IAM Team",
    status: "Healthy",
    region: "ap-southeast-1",
    actions: ["sync-users", "unlock-account", "review-role-map"],
    accounts: [
      { id: "kc-100", username: "pham.khoa", status: "Suspended", lastLogin: "2026-04-20T08:12:00Z" },
      { id: "kc-101", username: "nguyen.huy", status: "Active", lastLogin: "2026-04-20T09:11:00Z" },
    ],
    roles: [
      { id: "kc-role-1", name: "finance-admin", scope: "realm", members: 3 },
      { id: "kc-role-2", name: "vendor-vpn-user", scope: "client", members: 48 },
    ],
    groups: [
      { id: "kc-group-1", name: "hr-onboarding", members: 22 },
      { id: "kc-group-2", name: "finance-privileged", members: 7 },
    ],
    tickets: [
      { id: "ITSM-1024", title: "Unlock user after MFA reset", status: "Pending approval" },
      { id: "ITSM-1029", title: "Review privileged group assignment", status: "In progress" },
    ],
  },
  {
    id: "openvpn",
    name: "OpenVPN",
    owner: "Infrastructure Operations",
    status: "Monitoring",
    region: "ap-southeast-1",
    actions: ["rotate-certificates", "sync-vendor-access", "disable-session"],
    accounts: [
      { id: "vpn-301", username: "vendor-dc-01", status: "Active", lastLogin: "2026-04-20T07:41:00Z" },
      { id: "vpn-302", username: "vendor-dc-02", status: "Expiring", lastLogin: "2026-04-19T21:18:00Z" },
    ],
    roles: [
      { id: "vpn-role-1", name: "branch-hcmc", scope: "network", members: 56 },
      { id: "vpn-role-2", name: "vendor-datacenter", scope: "network", members: 11 },
    ],
    groups: [
      { id: "vpn-group-1", name: "vendors-q2", members: 18 },
      { id: "vpn-group-2", name: "night-shift-support", members: 9 },
    ],
    tickets: [
      { id: "ITSM-1031", title: "Rotate expiring vendor certificates", status: "Needs input" },
      { id: "ITSM-1034", title: "Enable branch VPN access", status: "Pending approval" },
    ],
  },
  {
    id: "jira",
    name: "Jira",
    owner: "Atlassian Administration",
    status: "Healthy",
    region: "ap-southeast-1",
    actions: ["sync-project-roles", "grant-project-admin", "review-access-bundles"],
    accounts: [
      { id: "jira-501", username: "nguyen.huy", status: "Active", lastLogin: "2026-04-20T09:27:00Z" },
      { id: "jira-502", username: "pham.thu.ha", status: "Active", lastLogin: "2026-04-20T08:48:00Z" },
    ],
    roles: [
      { id: "jira-role-1", name: "FIN-ERP-admin", scope: "project", members: 4 },
      { id: "jira-role-2", name: "service-ops-editor", scope: "project", members: 17 },
    ],
    groups: [
      { id: "jira-group-1", name: "finance-delivery", members: 26 },
      { id: "jira-group-2", name: "service-ops", members: 34 },
    ],
    tickets: [
      { id: "ITSM-1008", title: "Grant FIN-ERP project admin access", status: "Pending approval" },
      { id: "ITSM-1015", title: "Review manual Jira role grants", status: "In progress" },
    ],
  },
  {
    id: "servicedesk",
    name: "ServiceDesk",
    owner: "ITSM Team",
    status: "Needs attention",
    region: "ap-southeast-1",
    actions: ["reroute-ticket", "rerun-webhook", "close-stale-queue"],
    accounts: [
      { id: "sd-701", username: "servicebot", status: "Active", lastLogin: "2026-04-20T09:40:00Z" },
      { id: "sd-702", username: "night-shift-support", status: "Active", lastLogin: "2026-04-20T06:05:00Z" },
    ],
    roles: [
      { id: "sd-role-1", name: "support-level-2", scope: "queue", members: 12 },
      { id: "sd-role-2", name: "iam-approver", scope: "workflow", members: 6 },
    ],
    groups: [
      { id: "sd-group-1", name: "identity-operations", members: 14 },
      { id: "sd-group-2", name: "night-shift-support", members: 9 },
    ],
    tickets: [
      { id: "ITSM-1024", title: "Unlock user after MFA reset", status: "Pending approval" },
      { id: "ITSM-1037", title: "Route vendor VPN access renewal", status: "Blocked" },
    ],
  },
] as const

export const apiCatalog = [
  { method: "GET", path: "/api/catalog", description: "Returns the API catalog and supported resources." },
  { method: "GET", path: "/api/overview", description: "Returns dashboard summary, alerts, and operational highlights." },
  { method: "GET", path: "/api/systems", description: "Lists managed systems and connector health." },
  { method: "GET", path: "/api/systems/{system}", description: "Returns one system record by system id." },
  { method: "POST", path: "/api/systems/{system}/sync", description: "Triggers a mock synchronization job for a managed system." },
  { method: "GET", path: "/api/requests", description: "Lists access requests and approval queue items." },
  { method: "POST", path: "/api/requests", description: "Creates a new mock access request." },
  { method: "GET", path: "/api/requests/{id}", description: "Returns one access request by request id." },
  { method: "POST", path: "/api/requests/{id}/approve", description: "Approves a mock access request." },
  { method: "GET", path: "/api/changes", description: "Returns change windows, agenda items, and change policies." },
  { method: "GET", path: "/api/alerts", description: "Lists active platform alerts." },
  { method: "GET", path: "/api/activity", description: "Lists recent operational activity." },
  { method: "GET", path: "/api/policy-checks", description: "Returns policy coverage and governance checks." },
  { method: "GET", path: "/api/team", description: "Returns the operations roster." },
  { method: "GET", path: "/api/help", description: "Returns runbook categories and FAQ entries." },
  { method: "GET", path: "/api/settings", description: "Returns workspace settings such as notification preferences and appearance." },
  { method: "GET", path: "/api/settings/profile", description: "Returns the current operator profile settings." },
  { method: "PUT", path: "/api/settings/profile", description: "Updates the current operator profile settings in SQLite." },
  { method: "GET", path: "/api/settings/notifications", description: "Returns notification preference settings." },
  { method: "PUT", path: "/api/settings/notifications", description: "Bulk updates notification preferences in SQLite." },
  { method: "PATCH", path: "/api/settings/notifications/{id}", description: "Updates one notification preference in SQLite." },
  { method: "GET", path: "/api/settings/appearance", description: "Returns persisted appearance settings." },
  { method: "PUT", path: "/api/settings/appearance", description: "Updates persisted appearance settings in SQLite." },
  { method: "GET", path: "/api/connections", description: "Lists configured external connections and their persisted settings." },
  { method: "GET", path: "/api/connections/{connector}", description: "Returns one connection resource by connector id." },
  { method: "PUT", path: "/api/connections/{connector}", description: "Updates one connection resource in SQLite." },
  { method: "POST", path: "/api/connections/{connector}/checks", description: "Creates a live connectivity check for the selected connector." },
  { method: "GET", path: "/api/keycloak/users", description: "Returns paginated Keycloak users from the configured realm with password and group summaries." },
  { method: "POST", path: "/api/keycloak/users", description: "Creates a new Keycloak user in the configured realm." },
  { method: "GET", path: "/api/keycloak/users/{id}", description: "Returns detailed Keycloak user data including credentials, groups, sessions, role mappings, and events." },
  { method: "GET", path: "/api/keycloak/users/{id}/profile", description: "Returns the editable Keycloak user profile payload and realm profile metadata." },
  { method: "PATCH", path: "/api/keycloak/users/{id}", description: "Updates the core profile and state for a Keycloak user." },
  { method: "PUT", path: "/api/keycloak/users/{id}/profile", description: "Updates the Keycloak user profile payload used by the edit panel." },
  { method: "PUT", path: "/api/keycloak/users/{id}/password", description: "Sets a new password for a Keycloak user." },
  { method: "DELETE", path: "/api/keycloak/users/{id}/otp", description: "Removes enrolled OTP credentials for a Keycloak user." },
  { method: "POST", path: "/api/keycloak/users/{id}/logout", description: "Terminates all active sessions for a Keycloak user." },
  { method: "DELETE", path: "/api/keycloak/users/{id}/login-failures", description: "Clears brute-force login failures for a Keycloak user." },
  { method: "GET", path: "/api/keycloak/groups", description: "Returns flattened Keycloak groups from the configured realm with hierarchy and mapping summaries." },
  { method: "GET", path: "/api/keycloak/groups/{id}", description: "Returns detailed Keycloak group data including members, role mappings, and recent admin events." },
  { method: "GET", path: "/api/openvpn/users", description: "Returns paginated OpenVPN users with group, auth, and security posture summaries." },
  { method: "POST", path: "/api/openvpn/users", description: "Creates a new OpenVPN user profile." },
  { method: "GET", path: "/api/openvpn/users/{name}", description: "Returns detailed OpenVPN user data including user properties, IP access lists, and assigned domain rulesets." },
  { method: "PATCH", path: "/api/openvpn/users/{name}", description: "Updates the core OpenVPN user properties." },
  { method: "PUT", path: "/api/openvpn/users/{name}/access-routes/{listType}", description: "Replaces one explicit OpenVPN IP access list for a user." },
  { method: "POST", path: "/api/openvpn/users/{name}/rulesets", description: "Creates and assigns a new domain ruleset to an OpenVPN user." },
  { method: "DELETE", path: "/api/openvpn/users/{name}/rulesets/{rulesetId}", description: "Unassigns a domain ruleset from an OpenVPN user." },
  { method: "GET", path: "/api/openvpn/groups", description: "Returns paginated OpenVPN groups with membership, subnet, and security summaries." },
  { method: "POST", path: "/api/openvpn/groups", description: "Creates a new OpenVPN group profile." },
  { method: "GET", path: "/api/openvpn/groups/{name}", description: "Returns detailed OpenVPN group data including members, IP access lists, and assigned domain rulesets." },
  { method: "PATCH", path: "/api/openvpn/groups/{name}", description: "Updates the core OpenVPN group properties." },
  { method: "PUT", path: "/api/openvpn/groups/{name}/access-routes/{listType}", description: "Replaces one explicit OpenVPN IP access list for a group." },
  { method: "POST", path: "/api/openvpn/groups/{name}/rulesets", description: "Creates and assigns a new domain ruleset to an OpenVPN group." },
  { method: "DELETE", path: "/api/openvpn/groups/{name}/rulesets/{rulesetId}", description: "Unassigns a domain ruleset from an OpenVPN group." },
  { method: "PATCH", path: "/api/openvpn/rulesets/{id}", description: "Updates an OpenVPN domain ruleset metadata record." },
  { method: "DELETE", path: "/api/openvpn/rulesets/{id}", description: "Deletes an OpenVPN domain ruleset." },
  { method: "GET", path: "/api/openvpn/rulesets/{id}/rules", description: "Returns all domain rules currently stored in an OpenVPN ruleset." },
  { method: "PUT", path: "/api/openvpn/rulesets/{id}/rules", description: "Replaces all domain rules in an OpenVPN ruleset." },
  { method: "GET", path: "/api/email-templates", description: "Lists editable HTML email templates stored in SQLite." },
  { method: "POST", path: "/api/email-templates", description: "Creates a new HTML email template in SQLite." },
  { method: "GET", path: "/api/email-templates/{id}", description: "Returns one email template including HTML source and preview data." },
  { method: "PUT", path: "/api/email-templates/{id}", description: "Updates one email template and records an audit event." },
  { method: "DELETE", path: "/api/email-templates/{id}", description: "Deletes one email template and records an audit event." },
  { method: "GET", path: "/api/audit", description: "Returns recent audit events and summary metrics from SQLite." },
  { method: "GET", path: "/api/platforms", description: "Lists connector-backed platforms and their supported actions." },
  { method: "GET", path: "/api/platforms/{platform}", description: "Returns detailed platform data including accounts, roles, groups, and tickets." },
  { method: "POST", path: "/api/platforms/{platform}/actions", description: "Executes a mock platform action such as sync, unlock, or reroute." },
] as const

export function getSystemById(systemId: string) {
  return systems.find((system) => system.id === systemId)
}

export function getRequestById(requestId: string) {
  return accessRequests.find((request) => request.id === requestId)
}

export function getPlatformById(platformId: string) {
  return platformCatalog.find((platform) => platform.id === platformId)
}
