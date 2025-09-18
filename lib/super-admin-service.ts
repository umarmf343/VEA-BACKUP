import { randomUUID } from "crypto";

export type TenantStatus = "active" | "trial" | "suspended";
export type TenantPlan = "starter" | "growth" | "enterprise";
export type StatusLevel = "healthy" | "warning" | "critical";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type NotificationCategory = "system" | "academic" | "payment" | "user" | "security";
export type NotificationKind = "info" | "success" | "warning" | "error";
export type ActivityType = "user" | "report" | "payment" | "assignment" | "system" | "security";
export type Audience = "super-admin" | "admin" | "teacher" | "student" | "parent" | "librarian" | "accountant";

export type ServiceOperationalStatus = "operational" | "degraded" | "maintenance" | "outage";

export interface ServiceStatusEntry {
  id: string;
  name: string;
  status: ServiceOperationalStatus;
  summary: string;
  uptime: number;
  dependencies: string[];
  incidents: {
    open: number;
    total: number;
  };
  updatedAt: string;
}

export interface ServiceStatusSnapshot {
  updatedAt: string;
  overallStatus: ServiceOperationalStatus;
  services: ServiceStatusEntry[];
}

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: TenantStatus;
  plan: TenantPlan;
  seats: number;
  activeUsers: number;
  contactEmail: string;
  contactPhone?: string;
  location: string;
  modulesEnabled: string[];
  createdAt: string;
  lastSyncAt: string;
  storage: {
    usedGb: number;
    limitGb: number;
  };
}

export interface Incident {
  id: string;
  service: string;
  severity: IncidentSeverity;
  message: string;
  occurredAt: string;
  resolvedAt?: string;
}

export interface Notification {
  id: string;
  type: NotificationKind;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  category: NotificationCategory;
  actionRequired?: boolean;
  archived?: boolean;
  archivedAt?: string;
}

export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  priority: "low" | "medium" | "high";
  user?: string;
  audience?: Audience[];
}

interface UptimeEntry {
  timestamp: string;
  uptime: number;
  downtimeMinutes: number;
}

export interface SystemMetricsSnapshot {
  uptime: number;
  activeUsers: number;
  databaseConnections: number;
  serverLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  apiResponseTime: number;
  lastBackupAt: string;
  serverStatus: StatusLevel;
  databaseStatus: StatusLevel;
  overallStatus: StatusLevel;
  updatedAt: string;
}

interface ServiceStatusInternal {
  id: string;
  name: string;
  status: ServiceOperationalStatus;
  baselineSummary: string;
  summary: string;
  uptime: number;
  dependencies: string[];
  incidentKey: string;
  updatedAt: string;
}

interface SuperAdminState {
  tenants: Tenant[];
  incidents: Incident[];
  notifications: Notification[];
  activities: Activity[];
  uptimeLog: UptimeEntry[];
  systemMetrics: SystemMetricsSnapshot;
  lastDeploymentAt: string;
  serviceStatuses: ServiceStatusInternal[];
  serviceStatusUpdatedAt: string;
}

export interface SuperAdminSnapshot {
  tenants: number;
  uptime: string;
  uptimeValue: number;
  errors24h: number;
  openIncidents: number;
  totalUsers: number;
  unreadNotifications: number;
  lastDeploymentAt: string;
  uptimeTrend: number[];
}

const GLOBAL_STATE_KEY = "__veaSuperAdminState";

type GlobalWithState = typeof globalThis & { [GLOBAL_STATE_KEY]?: SuperAdminState };

const structuredCloneFn =
  typeof (globalThis as any).structuredClone === "function"
    ? ((globalThis as any).structuredClone as <T>(value: T) => T)
    : undefined;

function clone<T>(value: T): T {
  if (structuredCloneFn) {
    return structuredCloneFn(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function adjustMetric(value: number, delta: number, min: number, max: number, precision = 0) {
  const offset = Math.random() * delta * 2 - delta;
  const next = clamp(value + offset, min, max);
  if (precision > 0) {
    const factor = 10 ** precision;
    return Math.round(next * factor) / factor;
  }

  return Math.round(next);
}

function formatDowntimeMinutes(uptime: number) {
  const downtime = ((100 - uptime) / 100) * 1440;
  return Number(downtime.toFixed(1));
}

function daysAgoISO(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function computeServerStatus(load: number, memory: number, apiResponse: number): StatusLevel {
  if (load >= 92 || memory >= 92 || apiResponse >= 420) {
    return "critical";
  }

  if (load >= 75 || memory >= 82 || apiResponse >= 320) {
    return "warning";
  }

  return "healthy";
}

function computeDatabaseStatus(connections: number): StatusLevel {
  if (connections >= 26) {
    return "critical";
  }

  if (connections >= 20) {
    return "warning";
  }

  return "healthy";
}

function computeOverallStatus(metrics: SystemMetricsSnapshot): StatusLevel {
  if (metrics.serverStatus === "critical" || metrics.databaseStatus === "critical") {
    return "critical";
  }

  if (metrics.serverStatus === "warning" || metrics.databaseStatus === "warning") {
    return "warning";
  }

  if (metrics.networkLatency > 80 || metrics.apiResponseTime > 360) {
    return "warning";
  }

  return "healthy";
}

function createInitialState(): SuperAdminState {
  const uptimeSeed = [
    99.94, 99.95, 99.96, 99.97, 99.95, 99.96, 99.98, 99.97, 99.93, 99.96, 99.97, 99.98, 99.95, 99.97,
  ];

  const uptimeLog: UptimeEntry[] = uptimeSeed.map((uptime, index) => {
    const offset = uptimeSeed.length - 1 - index;
    return {
      timestamp: daysAgoISO(offset),
      uptime,
      downtimeMinutes: formatDowntimeMinutes(uptime),
    };
  });

  const tenants: Tenant[] = [
    {
      id: "vea-hq",
      name: "Victory Educational Academy (HQ)",
      domain: "portal2.victoryeducationalacademy.com.ng",
      status: "active",
      plan: "enterprise",
      seats: 1500,
      activeUsers: 1187,
      contactEmail: "support@victoryeducationalacademy.com.ng",
      contactPhone: "+234 809 234 1122",
      location: "Abuja, Nigeria",
      modulesEnabled: ["academics", "finance", "library", "messaging", "analytics"],
      createdAt: daysAgoISO(1825),
      lastSyncAt: daysAgoISO(0),
      storage: { usedGb: 182, limitGb: 512 },
    },
    {
      id: "vea-annex",
      name: "Victory Annex Campus",
      domain: "annex.victoryeducationalacademy.com.ng",
      status: "trial",
      plan: "growth",
      seats: 600,
      activeUsers: 312,
      contactEmail: "annex@victoryeducationalacademy.com.ng",
      contactPhone: "+234 803 990 8877",
      location: "Gwagwalada, Abuja",
      modulesEnabled: ["academics", "finance", "messaging"],
      createdAt: daysAgoISO(210),
      lastSyncAt: daysAgoISO(1),
      storage: { usedGb: 64, limitGb: 256 },
    },
    {
      id: "vea-boarding",
      name: "Victory Boarding School",
      domain: "boarding.victoryeducationalacademy.com.ng",
      status: "active",
      plan: "enterprise",
      seats: 900,
      activeUsers: 478,
      contactEmail: "boarding@victoryeducationalacademy.com.ng",
      contactPhone: "+234 802 440 9987",
      location: "Keffi, Nasarawa",
      modulesEnabled: ["academics", "finance", "boarding", "messaging", "analytics"],
      createdAt: daysAgoISO(640),
      lastSyncAt: daysAgoISO(0),
      storage: { usedGb: 121, limitGb: 384 },
    },
  ];

  const incidents: Incident[] = [
    {
      id: "inc-001",
      service: "Payments",
      severity: "high",
      message: "Paystack callback latency detected for annex campus.",
      occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: "inc-002",
      service: "Library",
      severity: "medium",
      message: "Catalog synchronization queued for retry after timeout.",
      occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(),
    },
    {
      id: "inc-003",
      service: "Authentication",
      severity: "critical",
      message: "Unusual login velocity from shared administrator account.",
      occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: "inc-004",
      service: "Reports",
      severity: "low",
      message: "Report export queue restarted automatically.",
      occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
      resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 71).toISOString(),
    },
  ];

  const notifications: Notification[] = [
    {
      id: "not-001",
      type: "warning",
      title: "Pending Approval",
      message: "Teacher onboarding requests require Super Admin review.",
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      read: false,
      category: "user",
      actionRequired: true,
    },
    {
      id: "not-002",
      type: "success",
      title: "Payment Reconciliation Complete",
      message: "Offline payments for Victory Annex were reconciled successfully.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
      read: true,
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 3.5).toISOString(),
      category: "payment",
    },
    {
      id: "not-003",
      type: "error",
      title: "Security Alert",
      message: "Multiple failed login attempts detected for finance officer role.",
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
      category: "security",
      actionRequired: true,
    },
    {
      id: "not-004",
      type: "info",
      title: "Curriculum Update",
      message: "New WAEC curriculum templates are available for review.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      read: true,
      readAt: new Date(Date.now() - 1000 * 60 * 60 * 17).toISOString(),
      category: "academic",
    },
    {
      id: "not-005",
      type: "warning",
      title: "Storage Threshold",
      message: "Victory Boarding School has used 70% of allocated storage.",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      read: false,
      category: "system",
      actionRequired: true,
    },
  ];

  const activities: Activity[] = [
    {
      id: "act-001",
      type: "user",
      title: "Admin Invitation Sent",
      description: "Super Admin invited a new admin for Victory Annex campus.",
      timestamp: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
      priority: "medium",
      user: "Adeola Badmus",
      audience: ["super-admin", "admin"],
    },
    {
      id: "act-002",
      type: "report",
      title: "Term Report Published",
      description: "SS2 term three report cards published for 385 students.",
      timestamp: new Date(Date.now() - 1000 * 60 * 95).toISOString(),
      priority: "high",
      user: "Academic Control",
      audience: ["super-admin", "admin", "teacher"],
    },
    {
      id: "act-003",
      type: "payment",
      title: "Fee Collection Update",
      description: "₦8,450,000 received via Paystack for HQ campus.",
      timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
      priority: "medium",
      user: "Finance Automation",
      audience: ["super-admin", "accountant"],
    },
    {
      id: "act-004",
      type: "assignment",
      title: "Bulk Assignment Upload",
      description: "15 new assignments uploaded for JSS classes.",
      timestamp: new Date(Date.now() - 1000 * 60 * 260).toISOString(),
      priority: "low",
      user: "Teacher Portal",
      audience: ["super-admin", "teacher"],
    },
    {
      id: "act-005",
      type: "system",
      title: "Automated Backup Completed",
      description: "Nightly database backup stored in encrypted vault.",
      timestamp: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
      priority: "low",
      user: "System",
      audience: ["super-admin"],
    },
    {
      id: "act-006",
      type: "security",
      title: "Two-factor Authentication Enabled",
      description: "Finance team enforced 2FA for all external logins.",
      timestamp: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      priority: "high",
      user: "Security Automation",
      audience: ["super-admin", "accountant"],
    },
  ];

  const baseMetrics: SystemMetricsSnapshot = {
    uptime: 99.97,
    activeUsers: tenants.reduce((total, tenant) => total + tenant.activeUsers, 0),
    databaseConnections: 18,
    serverLoad: 52,
    memoryUsage: 61,
    diskUsage: 72,
    networkLatency: 24,
    apiResponseTime: 210,
    lastBackupAt: new Date(Date.now() - 1000 * 60 * 37).toISOString(),
    serverStatus: "healthy",
    databaseStatus: "healthy",
    overallStatus: "healthy",
    updatedAt: new Date().toISOString(),
  };

  baseMetrics.serverStatus = computeServerStatus(baseMetrics.serverLoad, baseMetrics.memoryUsage, baseMetrics.apiResponseTime);
  baseMetrics.databaseStatus = computeDatabaseStatus(baseMetrics.databaseConnections);
  baseMetrics.overallStatus = computeOverallStatus(baseMetrics);

  const statusTimestamp = new Date().toISOString();
  const serviceStatuses: ServiceStatusInternal[] = [
    {
      id: "database",
      name: "Database Cluster",
      status: "operational",
      baselineSummary: "Primary and read replicas are healthy across availability zones.",
      summary: "Primary and read replicas are healthy across availability zones.",
      uptime: 99.98,
      dependencies: ["PostgreSQL (multi-AZ)", "Redis Cache"],
      incidentKey: "Database",
      updatedAt: statusTimestamp,
    },
    {
      id: "payments",
      name: "Payment Processing",
      status: "operational",
      baselineSummary: "Paystack and Flutterwave webhooks are synchronised.",
      summary: "Paystack and Flutterwave webhooks are synchronised.",
      uptime: 99.67,
      dependencies: ["Paystack", "Flutterwave"],
      incidentKey: "Payments",
      updatedAt: statusTimestamp,
    },
    {
      id: "authentication",
      name: "Authentication Services",
      status: "degraded",
      baselineSummary: "Centrally managed identity provider with MFA enforcement.",
      summary: "Centrally managed identity provider with MFA enforcement.",
      uptime: 99.42,
      dependencies: ["Keycloak", "SMS OTP Gateway"],
      incidentKey: "Authentication",
      updatedAt: statusTimestamp,
    },
    {
      id: "reports",
      name: "Report Generation",
      status: "operational",
      baselineSummary: "Scheduled exports and analytics pipelines operating normally.",
      summary: "Scheduled exports and analytics pipelines operating normally.",
      uptime: 99.71,
      dependencies: ["Analytics Workers", "S3 Storage"],
      incidentKey: "Reports",
      updatedAt: statusTimestamp,
    },
    {
      id: "library",
      name: "Digital Library",
      status: "maintenance",
      baselineSummary: "Catalog indexing nodes are healthy.",
      summary: "Catalog indexing nodes are healthy.",
      uptime: 99.58,
      dependencies: ["Elasticsearch", "S3 Storage"],
      incidentKey: "Library",
      updatedAt: statusTimestamp,
    },
    {
      id: "messaging",
      name: "Messaging & Alerts",
      status: "operational",
      baselineSummary: "Push notifications, SMS and email brokers connected.",
      summary: "Push notifications, SMS and email brokers connected.",
      uptime: 99.87,
      dependencies: ["FCM", "Twilio", "SendGrid"],
      incidentKey: "Messaging",
      updatedAt: statusTimestamp,
    },
  ];

  return {
    tenants,
    incidents,
    notifications,
    activities,
    uptimeLog,
    systemMetrics: baseMetrics,
    lastDeploymentAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    serviceStatuses,
    serviceStatusUpdatedAt: statusTimestamp,
  };
}

function getState(): SuperAdminState {
  const globalScope = globalThis as GlobalWithState;
  if (!globalScope[GLOBAL_STATE_KEY]) {
    globalScope[GLOBAL_STATE_KEY] = createInitialState();
  }

  return globalScope[GLOBAL_STATE_KEY]!;
}

function sortByTimestampDesc<T extends { timestamp: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function listNotificationsInternal() {
  const state = getState();
  return sortByTimestampDesc(state.notifications.filter((notification) => !notification.archived));
}

function mutateNotifications(
  ids: string[] | undefined,
  patch: (notification: Notification) => Partial<Notification> | undefined,
) {
  const state = getState();
  const idSet = ids && ids.length > 0 ? new Set(ids) : null;

  state.notifications = state.notifications.map((notification) => {
    if (idSet && !idSet.has(notification.id)) {
      return notification;
    }

    const changes = patch(notification);
    if (!changes) {
      return notification;
    }

    return { ...notification, ...changes };
  });

  return listNotificationsInternal();
}

export function getOverviewMetrics(): SuperAdminSnapshot {
  const state = getState();
  const now = Date.now();

  const activeTenants = state.tenants.filter((tenant) => tenant.status === "active").length;
  const uptimeAverage =
    state.uptimeLog.reduce((total, entry) => total + entry.uptime, 0) / Math.max(state.uptimeLog.length, 1);

  const errors24h = state.incidents.filter((incident) => {
    if (incident.severity === "low") {
      return false;
    }

    const occurred = new Date(incident.occurredAt).getTime();
    return now - occurred <= 1000 * 60 * 60 * 24;
  }).length;

  const openIncidents = state.incidents.filter((incident) => !incident.resolvedAt).length;
  const totalUsers = state.tenants.reduce((total, tenant) => total + tenant.activeUsers, 0);
  const unreadNotifications = state.notifications.filter((notification) => !notification.read && !notification.archived).length;

  return {
    tenants: activeTenants,
    uptime: `${uptimeAverage.toFixed(2)}%`,
    uptimeValue: Number(uptimeAverage.toFixed(2)),
    errors24h,
    openIncidents,
    totalUsers,
    unreadNotifications,
    lastDeploymentAt: state.lastDeploymentAt,
    uptimeTrend: state.uptimeLog.slice(-7).map((entry) => Number(entry.uptime.toFixed(2))),
  };
}

export function getSystemMetrics(options: { refresh?: boolean } = {}) {
  const state = getState();
  const { systemMetrics } = state;
  const now = Date.now();
  const shouldRefresh = options.refresh || now - new Date(systemMetrics.updatedAt).getTime() > 30_000;

  if (shouldRefresh) {
    const next: SystemMetricsSnapshot = {
      ...systemMetrics,
      activeUsers: adjustMetric(systemMetrics.activeUsers, 38, 220, 1500),
      databaseConnections: adjustMetric(systemMetrics.databaseConnections, 4, 10, 28),
      serverLoad: adjustMetric(systemMetrics.serverLoad, 9, 20, 94),
      memoryUsage: adjustMetric(systemMetrics.memoryUsage, 7, 35, 93),
      diskUsage: adjustMetric(systemMetrics.diskUsage, 4, 50, 90),
      networkLatency: adjustMetric(systemMetrics.networkLatency, 6, 12, 95),
      apiResponseTime: adjustMetric(systemMetrics.apiResponseTime, 26, 140, 460),
      uptime: adjustMetric(systemMetrics.uptime, 0.04, 99.4, 99.99, 2),
      updatedAt: new Date().toISOString(),
    };

    if (Math.random() > 0.78) {
      next.lastBackupAt = new Date(now - Math.floor(Math.random() * 120 + 30) * 60 * 1000).toISOString();
    }

    next.serverStatus = computeServerStatus(next.serverLoad, next.memoryUsage, next.apiResponseTime);
    next.databaseStatus = computeDatabaseStatus(next.databaseConnections);
    next.overallStatus = computeOverallStatus(next);

    state.systemMetrics = next;

    const lastEntry = state.uptimeLog[state.uptimeLog.length - 1];
    if (lastEntry) {
      lastEntry.uptime = Number(next.uptime.toFixed(2));
      lastEntry.downtimeMinutes = formatDowntimeMinutes(lastEntry.uptime);
      lastEntry.timestamp = next.updatedAt;
    }
  }

  return clone(state.systemMetrics);
}

export function getRecentActivities(limit = 15, audience?: Audience) {
  const state = getState();
  const filtered = state.activities.filter((activity) => {
    if (!audience || !activity.audience || activity.audience.length === 0) {
      return true;
    }

    return activity.audience.includes(audience);
  });

  return clone(sortByTimestampDesc(filtered).slice(0, Math.max(1, limit)));
}

export function getNotifications() {
  return clone(listNotificationsInternal());
}

export function setNotificationRead(ids: string[] | undefined, read: boolean) {
  const timestamp = new Date().toISOString();
  return clone(
    mutateNotifications(ids, () => ({
      read,
      readAt: read ? timestamp : undefined,
    })),
  );
}

export function archiveNotifications(ids: string[] | undefined) {
  const timestamp = new Date().toISOString();
  return clone(
    mutateNotifications(ids, () => ({
      archived: true,
      archivedAt: timestamp,
    })),
  );
}

export function getTenants() {
  const state = getState();
  return clone(state.tenants);
}

export function updateTenantStatus(tenantId: string, status: TenantStatus) {
  const state = getState();
  const index = state.tenants.findIndex((tenant) => tenant.id === tenantId);
  if (index === -1) {
    return null;
  }

  state.tenants[index] = {
    ...state.tenants[index],
    status,
    lastSyncAt: new Date().toISOString(),
  };

  return clone(state.tenants[index]);
}

export function appendActivity(activity: Omit<Activity, "id" | "timestamp"> & { id?: string; timestamp?: string }) {
  const state = getState();
  const entry: Activity = {
    id: activity.id ?? randomUUID(),
    timestamp: activity.timestamp ?? new Date().toISOString(),
    ...activity,
  };

  state.activities = sortByTimestampDesc([entry, ...state.activities]);
  return clone(entry);
}

function determineStatusFromIncidents(incidents: Incident[]): ServiceOperationalStatus | null {
  if (incidents.length === 0) {
    return null;
  }

  if (incidents.some((incident) => incident.severity === "critical")) {
    return "outage";
  }

  if (incidents.some((incident) => incident.severity === "high")) {
    return "degraded";
  }

  if (incidents.some((incident) => incident.severity === "medium")) {
    return "maintenance";
  }

  return "maintenance";
}

function computeOverallOperationalStatusFromServices(services: ServiceStatusInternal[]): ServiceOperationalStatus {
  const statuses = services.map((service) => service.status);
  if (statuses.includes("outage")) {
    return "outage";
  }

  if (statuses.includes("degraded")) {
    return "degraded";
  }

  if (statuses.includes("maintenance")) {
    return "maintenance";
  }

  return "operational";
}

function describeMaintenanceSummary(resolvedAt: number | null, now: number) {
  if (!resolvedAt) {
    return "Scheduled maintenance is in progress.";
  }

  const minutesAgo = Math.max(1, Math.round((now - resolvedAt) / 60_000));
  if (minutesAgo < 60) {
    return `Post-incident validation running (${minutesAgo} min ago).`;
  }

  const hoursAgo = Math.round(minutesAgo / 60);
  return `Stabilising after incident resolved ${hoursAgo} hr${hoursAgo === 1 ? "" : "s"} ago.`;
}

function refreshServiceStatus(
  service: ServiceStatusInternal,
  incidents: Incident[],
  timestamp: string,
): ServiceStatusInternal {
  const openIncidents = incidents.filter((incident) => !incident.resolvedAt);
  const statusFromIncidents = determineStatusFromIncidents(openIncidents);
  let status: ServiceOperationalStatus = statusFromIncidents ?? "operational";
  let summary = service.baselineSummary;

  if (openIncidents.length > 0) {
    const head = openIncidents[0];
    const severityLabel = head.severity.charAt(0).toUpperCase() + head.severity.slice(1);
    summary = `${severityLabel} incident: ${head.message}`;
  } else {
    const resolvedIncidents = incidents
      .filter((incident) => incident.resolvedAt)
      .sort((a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime());

    const latestResolved = resolvedIncidents[0];
    if (latestResolved) {
      const resolvedAt = new Date(latestResolved.resolvedAt!).getTime();
      const now = new Date(timestamp).getTime();
      if (now - resolvedAt < 3 * 60 * 60 * 1000 && status !== "outage") {
        status = "maintenance";
        summary = describeMaintenanceSummary(resolvedAt, now);
      }
    }

    if (status === "operational" && Math.random() > 0.94) {
      status = "maintenance";
      summary = "Automated optimisation checks running on background nodes.";
    }
  }

  let uptime = adjustMetric(service.uptime, 0.05, 97.2, 99.99, 2);
  if (status === "outage") {
    uptime = Math.max(95.2, uptime - Math.random() * 0.9);
  } else if (status === "degraded") {
    uptime = Math.max(96.5, uptime - Math.random() * 0.4);
  }

  return {
    ...service,
    status,
    summary,
    uptime,
    updatedAt: timestamp,
  };
}

export function getServiceStatusSnapshot(options: { refresh?: boolean } = {}): ServiceStatusSnapshot {
  const state = getState();
  const now = Date.now();
  const shouldRefresh = options.refresh || now - new Date(state.serviceStatusUpdatedAt).getTime() > 45_000;

  if (shouldRefresh) {
    const timestamp = new Date().toISOString();
    state.serviceStatuses = state.serviceStatuses.map((service) => {
      const incidents = state.incidents.filter(
        (incident) => incident.service.toLowerCase() === service.incidentKey.toLowerCase(),
      );
      return refreshServiceStatus(service, incidents, timestamp);
    });
    state.serviceStatusUpdatedAt = timestamp;
  }

  const services: ServiceStatusEntry[] = state.serviceStatuses.map((service) => {
    const incidents = state.incidents.filter(
      (incident) => incident.service.toLowerCase() === service.incidentKey.toLowerCase(),
    );
    const open = incidents.filter((incident) => !incident.resolvedAt).length;
    return {
      id: service.id,
      name: service.name,
      status: service.status,
      summary: service.summary,
      uptime: Number(service.uptime.toFixed(2)),
      dependencies: [...service.dependencies],
      incidents: {
        open,
        total: incidents.length,
      },
      updatedAt: service.updatedAt,
    };
  });

  const snapshot: ServiceStatusSnapshot = {
    updatedAt: state.serviceStatusUpdatedAt,
    overallStatus: computeOverallOperationalStatusFromServices(state.serviceStatuses),
    services,
  };

  return clone(snapshot);
}
