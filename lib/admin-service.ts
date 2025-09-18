import { randomUUID } from "crypto";

export type UserRole =
  | "super-admin"
  | "admin"
  | "teacher"
  | "student"
  | "parent"
  | "librarian"
  | "accountant";

export type UserStatus = "active" | "inactive" | "suspended";

export type ActivityType = "user" | "report" | "payment" | "assignment" | "system" | "security";

export type ActivityPriority = "low" | "medium" | "high";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  lastLogin?: string;
  assignedClasses?: string[];
  assignedSubjects?: string[];
  parentId?: string;
  studentIds?: string[];
}

export interface AdminActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  priority: ActivityPriority;
  user?: string;
  audience?: UserRole[];
}

export type NotificationType = "info" | "success" | "warning" | "error";

export type NotificationCategory = "system" | "academic" | "payment" | "user" | "security";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  readAt?: string;
  category: NotificationCategory;
  actionRequired?: boolean;
  archived?: boolean;
  archivedAt?: string;
  audience?: UserRole[];
}

interface AdminNotice {
  id: string;
  title: string;
  status: "draft" | "scheduled" | "active" | "archived";
  publishedAt?: string;
}

interface PaymentSnapshot {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  recordedAt: string;
  studentId?: string;
  reference?: string;
}

export interface AdminDashboardSnapshot {
  users: number;
  paymentsToday: number;
  notices: number;
  activeUsers: number;
  pendingApprovals: number;
}

export interface AdminOverviewSnapshot {
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalRevenue: number;
  paidStudents: number;
  pendingPayments: number;
  overduePayments: number;
}

interface AdminState {
  users: AdminUser[];
  activities: AdminActivity[];
  notifications: AdminNotification[];
  notices: AdminNotice[];
  payments: PaymentSnapshot[];
  overview: AdminOverviewSnapshot;
  pendingApprovals: number;
}

const GLOBAL_KEY = "__veaAdminState";

type GlobalWithState = typeof globalThis & { [GLOBAL_KEY]?: AdminState };

function getGlobal(): GlobalWithState {
  return globalThis as GlobalWithState;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function formatNaira(amount: number) {
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
  } catch (error) {
    console.error("Currency format fallback:", error);
    return `₦${Math.round(amount).toLocaleString()}`;
  }
}

function ensureState(): AdminState {
  const g = getGlobal();
  if (!g[GLOBAL_KEY]) {
    const now = new Date();
    const today = now.toISOString();
    g[GLOBAL_KEY] = {
      users: [
        {
          id: "usr-admin-1",
          name: "John Admin",
          email: "admin@vea.edu.ng",
          role: "admin",
          status: "active",
          createdAt: new Date(now.getTime() - 86_400_000 * 120).toISOString(),
          lastLogin: today,
        },
        {
          id: "usr-teacher-1",
          name: "Sarah Teacher",
          email: "sarah@vea.edu.ng",
          role: "teacher",
          status: "active",
          createdAt: new Date(now.getTime() - 86_400_000 * 90).toISOString(),
          lastLogin: new Date(now.getTime() - 45 * 60_000).toISOString(),
          assignedClasses: ["JSS1A", "JSS2B"],
          assignedSubjects: ["Mathematics", "Physics"],
        },
        {
          id: "usr-parent-1",
          name: "Mike Parent",
          email: "mike@parent.com",
          role: "parent",
          status: "active",
          createdAt: new Date(now.getTime() - 86_400_000 * 60).toISOString(),
          lastLogin: new Date(now.getTime() - 6 * 60_000).toISOString(),
          studentIds: ["std-004", "std-005"],
        },
        {
          id: "usr-student-1",
          name: "Grace Student",
          email: "grace@student.vea.edu.ng",
          role: "student",
          status: "active",
          createdAt: new Date(now.getTime() - 86_400_000 * 30).toISOString(),
          lastLogin: new Date(now.getTime() - 12 * 60_000).toISOString(),
          assignedClasses: ["SS1B"],
        },
      ],
      activities: [
        {
          id: "act-001",
          type: "payment",
          title: "Payment verified",
          description: "Verified ₦32,000 tuition payment for STU-1002.",
          timestamp: new Date(now.getTime() - 5 * 60_000).toISOString(),
          priority: "medium",
          user: "Finance Bot",
          audience: ["admin", "accountant"],
        },
        {
          id: "act-002",
          type: "user",
          title: "New teacher account",
          description: "Created an account for Mrs. Patricia Davis (Chemistry).",
          timestamp: new Date(now.getTime() - 45 * 60_000).toISOString(),
          priority: "low",
          user: "John Admin",
          audience: ["admin", "teacher"],
        },
        {
          id: "act-003",
          type: "system",
          title: "Backup completed",
          description: "Nightly academic records backup completed successfully.",
          timestamp: new Date(now.getTime() - 3 * 3_600_000).toISOString(),
          priority: "low",
          user: "System",
          audience: ["admin"],
        },
        {
          id: "act-004",
          type: "assignment",
          title: "New assignment",
          description: "Mathematics weekly quiz uploaded for JSS1 classes.",
          timestamp: new Date(now.getTime() - 6 * 3_600_000).toISOString(),
          priority: "medium",
          user: "Sarah Teacher",
          audience: ["teacher", "admin"],
        },
      ],
      notifications: [
        {
          id: "ntf-001",
          type: "warning",
          title: "Pending payment approvals",
          message: "5 offline payments require verification before settlement.",
          timestamp: new Date(now.getTime() - 12 * 60_000).toISOString(),
          read: false,
          category: "payment",
          actionRequired: true,
          audience: ["admin", "accountant"],
        },
        {
          id: "ntf-002",
          type: "info",
          title: "System maintenance",
          message: "Library module maintenance scheduled for tonight 10:00 PM.",
          timestamp: new Date(now.getTime() - 2 * 3_600_000).toISOString(),
          read: false,
          category: "system",
          audience: ["admin", "librarian"],
        },
        {
          id: "ntf-003",
          type: "success",
          title: "Parent onboarding complete",
          message: "All invited parents from PTA meeting have activated their accounts.",
          timestamp: new Date(now.getTime() - 18 * 3_600_000).toISOString(),
          read: true,
          readAt: new Date(now.getTime() - 16 * 3_600_000).toISOString(),
          category: "user",
          audience: ["admin"],
        },
        {
          id: "ntf-004",
          type: "error",
          title: "Payment gateway retry",
          message: "Retry initiated for failed ₦18,000 card transaction (STU-1033).",
          timestamp: new Date(now.getTime() - 90 * 60_000).toISOString(),
          read: false,
          category: "payment",
          actionRequired: true,
          audience: ["admin", "accountant"],
        },
      ],
      notices: [
        { id: "notice-001", title: "Mid-term examinations", status: "active", publishedAt: today },
        { id: "notice-002", title: "Staff meeting", status: "scheduled" },
        { id: "notice-003", title: "PTA newsletter", status: "draft" },
      ],
      payments: [
        {
          id: "pay-001",
          amount: 45000,
          status: "paid",
          recordedAt: new Date(now.getTime() - 30 * 60_000).toISOString(),
        },
        {
          id: "pay-002",
          amount: 32000,
          status: "pending",
          recordedAt: new Date(now.getTime() - 3 * 3_600_000).toISOString(),
        },
        {
          id: "pay-003",
          amount: 21000,
          status: "failed",
          recordedAt: new Date(now.getTime() - 26 * 3_600_000).toISOString(),
        },
        {
          id: "pay-004",
          amount: 60000,
          status: "paid",
          recordedAt: new Date(now.getTime() - 5 * 3_600_000).toISOString(),
        },
      ],
      overview: {
        totalStudents: 450,
        activeStudents: 435,
        totalTeachers: 25,
        totalRevenue: 22_500_000,
        paidStudents: 380,
        pendingPayments: 55,
        overduePayments: 15,
      },
      pendingApprovals: 7,
    };
  }
  return g[GLOBAL_KEY]!;
}

function pushActivity(state: AdminState, activity: AdminActivity) {
  state.activities = [activity, ...state.activities].slice(0, 50);
}

function pushNotification(state: AdminState, notification: AdminNotification) {
  state.notifications = [notification, ...state.notifications].slice(0, 50);
}

function upsertPaymentSnapshot(state: AdminState, snapshot: PaymentSnapshot) {
  const others = state.payments.filter((payment) => payment.id !== snapshot.id);
  state.payments = [snapshot, ...others].slice(0, 50);
}

function todayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function getAdminDashboardSnapshot(): AdminDashboardSnapshot {
  const state = ensureState();
  const nowKey = todayKey(new Date());
  const paymentsToday = state.payments.filter((payment) => todayKey(new Date(payment.recordedAt)) === nowKey).length;
  const activeUsers = state.users.filter((user) => user.status === "active").length;
  const notices = state.notices.filter((notice) => notice.status === "active").length;

  return {
    users: state.users.length,
    paymentsToday,
    notices,
    activeUsers,
    pendingApprovals: state.pendingApprovals,
  };
}

export function getAdminOverviewSnapshot(): AdminOverviewSnapshot {
  const state = ensureState();
  return clone(state.overview);
}

export function listAdminActivities(params: { role?: UserRole; limit?: number } = {}) {
  const { role, limit } = params;
  const state = ensureState();
  const items = state.activities
    .filter((activity) => {
      if (!role) return true;
      if (!activity.audience || activity.audience.length === 0) return true;
      return activity.audience.includes(role);
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return clone(typeof limit === "number" ? items.slice(0, limit) : items);
}

export function listAdminNotifications(role?: UserRole) {
  const state = ensureState();
  const notifications = state.notifications
    .filter((notification) => {
      if (!role) return !notification.archived;
      if (notification.archived) return false;
      if (!notification.audience || notification.audience.length === 0) return true;
      return notification.audience.includes(role);
    })
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return clone(notifications);
}

export function mutateAdminNotifications(
  action:
    | "mark-read"
    | "mark-unread"
    | "mark-all-read"
    | "mark-all-unread"
    | "archive",
  ids: string[] | undefined,
  role?: UserRole,
) {
  const state = ensureState();
  const now = new Date().toISOString();

  const matchesRole = (notification: AdminNotification) => {
    if (!role) return true;
    if (!notification.audience || notification.audience.length === 0) return true;
    return notification.audience.includes(role);
  };

  const targetIds = new Set(ids ?? []);
  const shouldMutate = (notification: AdminNotification) => {
    if (action === "mark-all-read" || action === "mark-all-unread") {
      return matchesRole(notification) && !notification.archived;
    }
    if (ids && ids.length > 0) {
      return targetIds.has(notification.id);
    }
    return matchesRole(notification) && !notification.archived;
  };

  state.notifications = state.notifications.map((notification) => {
    if (!shouldMutate(notification)) {
      return notification;
    }

    switch (action) {
      case "mark-read":
      case "mark-all-read":
        return { ...notification, read: true, readAt: now };
      case "mark-unread":
      case "mark-all-unread":
        return { ...notification, read: false, readAt: undefined };
      case "archive":
        return { ...notification, archived: true, archivedAt: now };
      default:
        return notification;
    }
  });

  return listAdminNotifications(role);
}

export interface CreateAdminUserInput {
  name: string;
  email: string;
  role: UserRole;
  assignedClasses?: string[];
  assignedSubjects?: string[];
  parentId?: string;
  studentIds?: string[];
}

export interface UpdateAdminUserInput extends Partial<CreateAdminUserInput> {
  status?: UserStatus;
  lastLogin?: string | null;
}

export function listAdminUsers() {
  const state = ensureState();
  const users = state.users
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return clone(users);
}

function buildUserActivity(user: AdminUser, action: string, priority: ActivityPriority = "medium"): AdminActivity {
  return {
    id: randomUUID(),
    type: "user",
    title: action,
    description: `${user.name} (${user.role})`,
    timestamp: new Date().toISOString(),
    priority,
    user: "Admin Service",
    audience: ["admin"],
  };
}

export function createAdminUser(input: CreateAdminUserInput) {
  const state = ensureState();
  const id = randomUUID();
  const now = new Date().toISOString();

  if (!input.name?.trim() || !input.email?.trim()) {
    throw new Error("Name and email are required");
  }

  const user: AdminUser = {
    id,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    role: input.role,
    status: "active",
    createdAt: now,
    lastLogin: now,
    assignedClasses: input.assignedClasses?.slice(),
    assignedSubjects: input.assignedSubjects?.slice(),
    parentId: input.parentId,
    studentIds: input.studentIds?.slice(),
  };

  state.users = [user, ...state.users];
  state.activities = [buildUserActivity(user, "New user created", "high"), ...state.activities].slice(0, 50);
  state.pendingApprovals = Math.max(0, state.pendingApprovals - 1);

  return clone(user);
}

export function updateAdminUser(id: string, updates: UpdateAdminUserInput) {
  const state = ensureState();
  const index = state.users.findIndex((user) => user.id === id);
  if (index === -1) {
    throw new Error("User not found");
  }

  const existing = state.users[index];
  const { lastLogin, ...rest } = updates;
  const updated: AdminUser = {
    ...existing,
    ...rest,
    name: updates.name?.trim() ?? existing.name,
    email: updates.email?.trim().toLowerCase() ?? existing.email,
    assignedClasses: updates.assignedClasses?.slice() ?? existing.assignedClasses,
    assignedSubjects: updates.assignedSubjects?.slice() ?? existing.assignedSubjects,
    studentIds: updates.studentIds?.slice() ?? existing.studentIds,
    lastLogin: lastLogin ?? existing.lastLogin,
  };

  state.users[index] = updated;
  state.activities = [buildUserActivity(updated, "User updated", "medium"), ...state.activities].slice(0, 50);

  return clone(updated);
}

export function deleteAdminUser(id: string) {
  const state = ensureState();
  const existing = state.users.find((user) => user.id === id);
  if (!existing) {
    throw new Error("User not found");
  }

  state.users = state.users.filter((user) => user.id !== id);
  state.activities = [buildUserActivity(existing, "User removed", "high"), ...state.activities].slice(0, 50);
  state.pendingApprovals += 1;

  return clone(existing);
}

export function recordAdminPasswordReset(id: string) {
  const state = ensureState();
  const user = state.users.find((candidate) => candidate.id === id);
  if (!user) {
    throw new Error("User not found");
  }

  const now = new Date().toISOString();
  const activity: AdminActivity = {
    id: randomUUID(),
    type: "security",
    title: "Password reset",
    description: `Password reset initiated for ${user.name} (${user.email}).`,
    timestamp: now,
    priority: "medium",
    user: "Admin Service",
    audience: ["admin"],
  };

  state.activities = [activity, ...state.activities].slice(0, 50);

  const notification: AdminNotification = {
    id: randomUUID(),
    type: "info",
    title: "Password reset completed",
    message: `${user.name}'s password was reset by an administrator.`,
    timestamp: now,
    read: false,
    category: "security",
    audience: ["admin"],
  };

  state.notifications = [notification, ...state.notifications].slice(0, 50);

  return clone(user);
}

export function markPaymentVerificationActivity(details: {
  paymentId: string;
  amount: number;
  studentId: string;
  reference?: string | null;
}) {
  const state = ensureState();
  const now = new Date().toISOString();
  const amount = Number.isFinite(details.amount) ? details.amount : 0;
  const formattedAmount = formatNaira(amount);
  const reference = details.reference && details.reference.trim() ? details.reference : details.paymentId;
  const existingSnapshot = state.payments.find((payment) => payment.id === details.paymentId);

  pushActivity(state, {
    id: randomUUID(),
    type: "payment",
    title: "Payment verified",
    description: `Verified ${formattedAmount} payment for ${details.studentId} (${reference}).`,
    timestamp: now,
    priority: "medium",
    user: "Admin Control Center",
    audience: ["admin", "accountant"],
  });

  pushNotification(state, {
    id: randomUUID(),
    type: "success",
    title: "Payment verification completed",
    message: `${formattedAmount} for ${details.studentId} has been verified successfully.`,
    timestamp: now,
    read: false,
    category: "payment",
    audience: ["admin", "accountant"],
  });

  upsertPaymentSnapshot(state, {
    id: details.paymentId,
    amount,
    status: "pending",
    recordedAt: now,
    studentId: details.studentId,
    reference,
  });

  if (!existingSnapshot || existingSnapshot.status === "failed") {
    state.pendingApprovals = Math.max(0, state.pendingApprovals - 1);
    state.overview.pendingPayments = Math.max(0, state.overview.pendingPayments - 1);
  }
}

export function recordPaymentSettlementActivity(details: {
  paymentId: string;
  amount: number;
  studentId: string;
  reference?: string | null;
  wasPreviouslyVerified?: boolean;
}) {
  const state = ensureState();
  const now = new Date().toISOString();
  const amount = Number.isFinite(details.amount) ? details.amount : 0;
  const formattedAmount = formatNaira(amount);
  const reference = details.reference && details.reference.trim() ? details.reference : details.paymentId;
  const existingSnapshot = state.payments.find((payment) => payment.id === details.paymentId);
  const wasAlreadyPaid = existingSnapshot?.status === "paid";

  pushActivity(state, {
    id: randomUUID(),
    type: "payment",
    title: "Payment marked as paid",
    description: `Marked ${formattedAmount} payment for ${details.studentId} as settled (${reference}).`,
    timestamp: now,
    priority: "medium",
    user: "Admin Control Center",
    audience: ["admin", "accountant"],
  });

  pushNotification(state, {
    id: randomUUID(),
    type: "success",
    title: "Payment settled",
    message: `${formattedAmount} for ${details.studentId} has been marked as paid.`,
    timestamp: now,
    read: false,
    category: "payment",
    audience: ["admin", "accountant"],
  });

  upsertPaymentSnapshot(state, {
    id: details.paymentId,
    amount,
    status: "paid",
    recordedAt: now,
    studentId: details.studentId,
    reference,
  });

  if (!wasAlreadyPaid && !details.wasPreviouslyVerified) {
    state.pendingApprovals = Math.max(0, state.pendingApprovals - 1);
  }

  if (!wasAlreadyPaid) {
    state.overview.pendingPayments = Math.max(0, state.overview.pendingPayments - 1);
    state.overview.totalRevenue = Math.max(0, state.overview.totalRevenue + amount);
    state.overview.paidStudents = Math.min(state.overview.totalStudents, state.overview.paidStudents + 1);
  }
}

export function resetAdminState() {
  // Exposed for tests: clears the in-memory cache.
  const g = getGlobal();
  delete g[GLOBAL_KEY];
}
