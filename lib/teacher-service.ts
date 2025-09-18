import { randomUUID } from "crypto";

import {
  dbManager,
  type Assignment,
  type AssignmentSubmission,
  type ClassRecord,
  type Student,
  type UserRecord,
} from "./database-manager";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export type ScheduleType = "lesson" | "meeting" | "duty" | "event";

type AssignmentStatus = "draft" | "assigned" | "submitted" | "graded";

type AssessmentStatus = "pending" | "in-review" | "completed";

type NotificationLevel = "info" | "success" | "warning" | "critical";

export interface TeacherProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  subjects: string[];
  formTeacherOf?: string;
  yearsOfExperience: number;
}

export interface TeacherClass {
  id: string;
  name: string;
  level: string;
  subject: string;
  studentCount: number;
  attendanceRate: number;
  lastUpdated: string;
  nextLessonTopic: string;
  schedule: Array<{
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    room: string;
  }>;
}

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string;
  classId: string;
  dueDate: string;
  status: AssignmentStatus;
  submissionsPending: number;
  submissionsGraded: number;
  resources?: string[];
  lastUpdated: string;
}

export interface TeacherAssessment {
  id: string;
  classId: string;
  title: string;
  type: "quiz" | "test" | "exam" | "project";
  studentName: string;
  submittedAt: string;
  dueDate: string;
  status: AssessmentStatus;
  remarks?: string;
}

export interface TeacherMessage {
  id: string;
  subject: string;
  preview: string;
  body: string;
  sentAt: string;
  sender: string;
  recipients: string[];
  read: boolean;
  archived?: boolean;
}

export interface TeacherNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  level: NotificationLevel;
  read: boolean;
  acknowledgedAt?: string;
  actionUrl?: string;
}

export interface TeacherScheduleItem {
  id: string;
  title: string;
  type: ScheduleType;
  startTime: string;
  endTime: string;
  location: string;
  classId?: string;
  notes?: string;
}

export interface TeacherDashboardMetrics {
  pendingMarks: number;
  assignments: number;
  messages: number;
  upcomingLessons: number;
  averageAttendance: number;
  gradeCompletion: number;
  lastSync: string;
}

interface AssignmentExtras {
  resources?: string[];
  lastUpdated: string;
}

interface TeacherState {
  assessments: TeacherAssessment[];
  messages: TeacherMessage[];
  notifications: TeacherNotification[];
  schedule: TeacherScheduleItem[];
  lastSync: string;
  profileFallback: TeacherProfile;
  assignmentExtras: Record<string, AssignmentExtras>;
}

const GLOBAL_KEY = "__veaTeacherState";
const TEACHER_USER_ID = "usr-teacher-1";

const CLASS_ENRICHMENT: Record<
  string,
  {
    subject?: string;
    nextLessonTopic: string;
    schedule: TeacherClass["schedule"];
  }
> = {
  "cls-jss1a": {
    subject: "Mathematics",
    nextLessonTopic: "Building algebraic fluency",
    schedule: [
      { day: "Monday", startTime: "08:00", endTime: "08:50", room: "Math Lab" },
      { day: "Wednesday", startTime: "10:00", endTime: "10:50", room: "Room 204" },
    ],
  },
  "cls-jss2a": {
    subject: "Mathematics",
    nextLessonTopic: "Probability fundamentals",
    schedule: [
      { day: "Tuesday", startTime: "09:00", endTime: "09:50", room: "Room 105" },
      { day: "Thursday", startTime: "11:00", endTime: "11:50", room: "Room 105" },
    ],
  },
  "cls-ss1a": {
    subject: "Physics",
    nextLessonTopic: "Newton's laws practical",
    schedule: [
      { day: "Monday", startTime: "12:00", endTime: "12:50", room: "Physics Lab" },
      { day: "Thursday", startTime: "09:00", endTime: "09:50", room: "Physics Lab" },
    ],
  },
};

type WithTeacherState = typeof globalThis & { [GLOBAL_KEY]?: TeacherState };

function getGlobal(): WithTeacherState {
  return globalThis as WithTeacherState;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function toIsoString(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function seedState(): TeacherState {
  const now = new Date();
  const today = now.toISOString();
  const startOfDay = (dayOffset: number, hour: number, minute = 0) => {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const assignmentExtras: Record<string, AssignmentExtras> = {
    "assign-001": {
      resources: ["algebra-revision-handout.pdf"],
      lastUpdated: today,
    },
    "assign-002": {
      resources: ["agric-practices-brief.docx"],
      lastUpdated: today,
    },
  };

  const assessments: TeacherAssessment[] = [
    {
      id: "asm-algebra-quiz",
      classId: "cls-jss1a",
      title: "Quiz 2 - Algebra basics",
      type: "quiz",
      studentName: "Amaka Obi",
      submittedAt: startOfDay(0, 7, 45),
      dueDate: startOfDay(0, 8),
      status: "pending",
      remarks: "Review question 4 workings.",
    },
    {
      id: "asm-agric-project",
      classId: "cls-jss2a",
      title: "Probability project - Group review",
      type: "project",
      studentName: "Group 3",
      submittedAt: startOfDay(-1, 15, 30),
      dueDate: startOfDay(-1, 16),
      status: "in-review",
      remarks: "Verify experimental data set.",
    },
    {
      id: "asm-physics-midterm",
      classId: "cls-ss1a",
      title: "Physics mid-term test",
      type: "test",
      studentName: "Class submission",
      submittedAt: startOfDay(-3, 11),
      dueDate: startOfDay(-3, 11),
      status: "pending",
      remarks: "Moderate grades with rubric.",
    },
  ];

  const messages: TeacherMessage[] = [
    {
      id: "msg-parent-amaka",
      subject: "Amaka - Homework follow up",
      preview: "Could you share how Amaka is coping with algebra?",
      body: "Good day, please how is Amaka adapting to the new mathematics topics? We would love to support her at home.",
      sentAt: startOfDay(-1, 18),
      sender: "Mrs. Ngozi Obi (Parent)",
      recipients: ["Mr. Samuel Eze"],
      read: false,
    },
    {
      id: "msg-hod-physics",
      subject: "Physics lab maintenance",
      preview: "Reminder: Update the lab checklist before Friday.",
      body: "Please ensure the physics lab equipment checklist is updated before the safety inspection on Friday.",
      sentAt: startOfDay(-2, 9, 30),
      sender: "Head of Science Department",
      recipients: ["Mr. Samuel Eze"],
      read: true,
    },
    {
      id: "msg-admin-meeting",
      subject: "Curriculum review meeting",
      preview: "Agenda for next week's curriculum review meeting.",
      body: "Attached is the agenda for the upcoming curriculum review meeting. Kindly review and come prepared.",
      sentAt: startOfDay(-3, 13, 15),
      sender: "Vice Principal Academics",
      recipients: ["Senior Secondary Staff"],
      read: true,
      archived: false,
    },
  ];

  const notifications: TeacherNotification[] = [
    {
      id: "ntf-jss2-attendance",
      title: "Attendance alert",
      message: "JSS 2A attendance dropped below 90% this week.",
      timestamp: startOfDay(-1, 14),
      level: "warning",
      read: false,
      actionUrl: "/teacher/classes/cls-jss2a",
    },
    {
      id: "ntf-new-submissions",
      title: "New assignment submission",
      message: "4 new submissions received for Algebra Revision.",
      timestamp: startOfDay(0, 6, 45),
      level: "info",
      read: false,
    },
    {
      id: "ntf-dept-meeting",
      title: "Department meeting confirmed",
      message: "Science department strategy session confirmed for Thursday 3pm.",
      timestamp: startOfDay(-2, 8),
      level: "success",
      read: true,
      acknowledgedAt: startOfDay(-2, 9),
    },
  ];

  const schedule: TeacherScheduleItem[] = [
    {
      id: "sch-jss1a-monday",
      title: "Mathematics - JSS 1A",
      type: "lesson",
      startTime: startOfDay(0, 8),
      endTime: startOfDay(0, 8, 50),
      location: "Math Lab",
      classId: "cls-jss1a",
      notes: "Introduce algebraic expressions with manipulatives.",
    },
    {
      id: "sch-jss2a-tuesday",
      title: "Mathematics - JSS 2A",
      type: "lesson",
      startTime: startOfDay(1, 9),
      endTime: startOfDay(1, 9, 50),
      location: "Room 105",
      classId: "cls-jss2a",
      notes: "Probability tree diagrams practical.",
    },
    {
      id: "sch-ss1a-thursday",
      title: "Physics - SS 1A",
      type: "lesson",
      startTime: startOfDay(3, 9),
      endTime: startOfDay(3, 9, 50),
      location: "Physics Lab",
      classId: "cls-ss1a",
      notes: "Conduct motion sensor experiments.",
    },
    {
      id: "sch-dept-meeting",
      title: "Science department strategy",
      type: "meeting",
      startTime: startOfDay(2, 15),
      endTime: startOfDay(2, 16, 30),
      location: "Conference Room B",
      notes: "Align lab improvement milestones.",
    },
  ];

  return {
    assessments,
    messages,
    notifications,
    schedule,
    lastSync: today,
    profileFallback: {
      id: TEACHER_USER_ID,
      name: "Mr. Samuel Eze",
      email: "samuel.eze@vea.edu.ng",
      avatar: "/avatars/teacher-samuel.png",
      subjects: ["Mathematics", "Further Mathematics"],
      formTeacherOf: "JSS 1A",
      yearsOfExperience: 9,
    },
    assignmentExtras,
  };
}

function ensureState(): TeacherState {
  const g = getGlobal();
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = seedState();
  }
  return g[GLOBAL_KEY]!;
}

function mapAssignmentStatus(assignment: Assignment, pending: number): AssignmentStatus {
  if (assignment.status === "closed") {
    return "graded";
  }
  if (pending > 0) {
    return "submitted";
  }
  if (assignment.status === "active" && pending === 0) {
    return "assigned";
  }
  return "assigned";
}

async function enrichClasses(classes: ClassRecord[]): Promise<TeacherClass[]> {
  const state = ensureState();
  const classPromises = classes.map(async (klass) => {
    const students = await dbManager.getStudentsByClass(klass.id);
    const studentCount = students.length;
    const attendanceRate = computeAttendanceRate(students);
    const enrichment = CLASS_ENRICHMENT[klass.id];

    return {
      id: klass.id,
      name: klass.name,
      level: klass.level,
      subject: enrichment?.subject ?? klass.subjects[0] ?? state.profileFallback.subjects[0] ?? "General Studies",
      studentCount,
      attendanceRate: Number(attendanceRate.toFixed(2)),
      lastUpdated: state.lastSync,
      nextLessonTopic: enrichment?.nextLessonTopic ?? "Lesson planning in progress",
      schedule: enrichment?.schedule ?? [],
    } satisfies TeacherClass;
  });

  const resolved = await Promise.all(classPromises);
  return resolved.sort((a, b) => a.name.localeCompare(b.name));
}

function computeAttendanceRate(students: Student[]): number {
  if (students.length === 0) return 0;
  const total = students.reduce((sum, student) => {
    const present = student.attendance?.present ?? 0;
    const totalDays = student.attendance?.total ?? 0;
    if (!totalDays) return sum;
    return sum + present / totalDays;
  }, 0);
  return total / students.length;
}

function collectSubmissionStats(
  submissions: AssignmentSubmission[],
): { graded: number; pending: number } {
  let graded = 0;
  let pending = 0;
  submissions.forEach((submission) => {
    if (submission.status === "graded") {
      graded += 1;
    } else {
      pending += 1;
    }
  });
  return { graded, pending };
}

export async function getTeacherDashboardMetrics(): Promise<TeacherDashboardMetrics> {
  const state = ensureState();
  const [assignments, classes] = await Promise.all([listTeacherAssignments(), listTeacherClasses()]);

  const pendingMarks = state.assessments.filter((assessment) => assessment.status !== "completed").length;
  const assignmentsNeedingAttention = assignments.filter((assignment) => assignment.status !== "graded").length;
  const unreadMessages = state.messages.filter((message) => !message.read && !message.archived).length;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const upcomingLessons = state.schedule.filter((item) => {
    const start = Date.parse(item.startTime);
    return item.type === "lesson" && start >= now && start <= now + sevenDays;
  }).length;

  const averageAttendance = classes.length
    ? classes.reduce((sum, klass) => sum + klass.attendanceRate, 0) / classes.length
    : 0;

  const totals = assignments.reduce(
    (acc, assignment) => {
      const totalSubmissions = assignment.submissionsGraded + assignment.submissionsPending;
      return {
        graded: acc.graded + assignment.submissionsGraded,
        total: acc.total + totalSubmissions,
      };
    },
    { graded: 0, total: 0 },
  );

  const gradeCompletion = totals.total > 0 ? Number((totals.graded / totals.total).toFixed(2)) : 0;

  return {
    pendingMarks,
    assignments: assignmentsNeedingAttention,
    messages: unreadMessages,
    upcomingLessons,
    averageAttendance: Number(averageAttendance.toFixed(2)),
    gradeCompletion,
    lastSync: state.lastSync,
  };
}

export async function listTeacherClasses(): Promise<TeacherClass[]> {
  const classes = await dbManager.getClasses();
  const teacherClasses = classes.filter((klass) => klass.classTeacherId === TEACHER_USER_ID);
  return enrichClasses(teacherClasses);
}

export async function listTeacherAssignments(): Promise<TeacherAssignment[]> {
  const state = ensureState();
  const assignments = await dbManager.getAssignments({ teacherId: TEACHER_USER_ID });
  const submissions = await dbManager.getAssignmentSubmissions({ assignmentIds: assignments.map((item) => item.id) });
  const submissionMap = new Map<string, AssignmentSubmission[]>();
  submissions.forEach((submission) => {
    const list = submissionMap.get(submission.assignmentId) ?? [];
    list.push(submission);
    submissionMap.set(submission.assignmentId, list);
  });

  return assignments
    .map((assignment) => {
      const stats = collectSubmissionStats(submissionMap.get(assignment.id) ?? []);
      const extras = state.assignmentExtras[assignment.id];
      const lastUpdated = extras?.lastUpdated ?? assignment.createdAt ?? new Date().toISOString();

      if (!extras) {
        state.assignmentExtras[assignment.id] = { lastUpdated };
      }

      return {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description ?? "",
        classId: assignment.classId,
        dueDate: toIsoString(assignment.dueDate),
        status: mapAssignmentStatus(assignment, stats.pending),
        submissionsPending: stats.pending,
        submissionsGraded: stats.graded,
        resources: state.assignmentExtras[assignment.id]?.resources,
        lastUpdated,
      } satisfies TeacherAssignment;
    })
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));
}

export async function createTeacherAssignment(payload: {
  title: string;
  description?: string;
  classId: string;
  dueDate: string;
  resources?: string[];
}): Promise<TeacherAssignment> {
  const state = ensureState();
  const classes = await dbManager.getClasses();
  const targetClass = classes.find((klass) => klass.id === payload.classId);
  const subject = targetClass?.subjects?.[0] ?? state.profileFallback.subjects[0] ?? "General Studies";
  const dueDateIso = toIsoString(payload.dueDate);

  const created = await dbManager.createAssignment({
    title: payload.title,
    description: payload.description ?? "",
    classId: payload.classId,
    teacherId: TEACHER_USER_ID,
    dueDate: dueDateIso,
    subject,
    status: "active",
  });

  const normalizedResources = payload.resources?.map((item) => String(item)).filter(Boolean) ?? undefined;
  const timestamp = new Date().toISOString();
  state.assignmentExtras[created.id] = {
    resources: normalizedResources,
    lastUpdated: timestamp,
  };
  state.lastSync = timestamp;

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? "",
    classId: created.classId,
    dueDate: toIsoString(created.dueDate),
    status: "assigned",
    submissionsPending: 0,
    submissionsGraded: 0,
    resources: normalizedResources,
    lastUpdated: timestamp,
  };
}

export async function updateTeacherAssignment(
  assignmentId: string,
  updates: Partial<Pick<TeacherAssignment, "status" | "submissionsPending" | "submissionsGraded" | "description" | "dueDate">>,
): Promise<TeacherAssignment | null> {
  const state = ensureState();
  const assignmentUpdates: Partial<Assignment> = {};

  if (typeof updates.description === "string") {
    assignmentUpdates.description = updates.description;
  }
  if (typeof updates.dueDate === "string") {
    assignmentUpdates.dueDate = toIsoString(updates.dueDate);
  }

  const shouldClose =
    updates.status === "graded" ||
    (typeof updates.submissionsPending === "number" && updates.submissionsPending <= 0 && updates.submissionsGraded !== undefined);

  if (typeof updates.status === "string") {
    assignmentUpdates.status = updates.status === "graded" ? "closed" : "active";
  } else if (shouldClose) {
    assignmentUpdates.status = "closed";
  }

  if (Object.keys(assignmentUpdates).length > 0) {
    await dbManager.updateAssignment(assignmentId, assignmentUpdates);
  }

  if (assignmentUpdates.status === "closed" || shouldClose) {
    await dbManager.updateAssignmentSubmissions(assignmentId, { status: "graded" });
  }

  const timestamp = new Date().toISOString();
  const extras = state.assignmentExtras[assignmentId] ?? { lastUpdated: timestamp };
  extras.lastUpdated = timestamp;
  state.assignmentExtras[assignmentId] = extras;
  state.lastSync = timestamp;

  const assignments = await listTeacherAssignments();
  return assignments.find((assignment) => assignment.id === assignmentId) ?? null;
}

export async function listTeacherAssessments(): Promise<TeacherAssessment[]> {
  const state = ensureState();
  return clone(
    state.assessments
      .slice()
      .sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt)),
  );
}

export async function updateTeacherAssessment(
  assessmentId: string,
  updates: Partial<Pick<TeacherAssessment, "status" | "remarks">>,
): Promise<TeacherAssessment | null> {
  const state = ensureState();
  const target = state.assessments.find((assessment) => assessment.id === assessmentId);
  if (!target) return null;

  if (typeof updates.status === "string") {
    target.status = updates.status;
  }
  if (typeof updates.remarks === "string") {
    target.remarks = updates.remarks;
  }

  state.lastSync = new Date().toISOString();
  return clone(target);
}

export async function listTeacherMessages(): Promise<TeacherMessage[]> {
  const state = ensureState();
  return clone(
    state.messages
      .slice()
      .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt)),
  );
}

export async function sendTeacherMessage(payload: {
  subject: string;
  body: string;
  recipients: string[];
}): Promise<TeacherMessage> {
  const state = ensureState();
  const now = new Date().toISOString();
  const message: TeacherMessage = {
    id: `msg-${randomUUID()}`,
    subject: payload.subject,
    preview: payload.body.slice(0, 120),
    body: payload.body,
    sentAt: now,
    sender: state.profileFallback.name,
    recipients: payload.recipients,
    read: true,
  };
  state.messages.unshift(message);
  state.lastSync = now;
  return clone(message);
}

export async function updateTeacherMessage(
  messageId: string,
  updates: Partial<Pick<TeacherMessage, "read" | "archived">>,
): Promise<TeacherMessage | null> {
  const state = ensureState();
  const target = state.messages.find((message) => message.id === messageId);
  if (!target) return null;

  if (typeof updates.read === "boolean") {
    target.read = updates.read;
  }
  if (typeof updates.archived === "boolean") {
    target.archived = updates.archived;
  }

  state.lastSync = new Date().toISOString();
  return clone(target);
}

export async function listTeacherNotifications(): Promise<TeacherNotification[]> {
  const state = ensureState();
  return clone(
    state.notifications
      .slice()
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)),
  );
}

export async function updateTeacherNotification(
  notificationId: string,
  updates: Partial<Pick<TeacherNotification, "read" | "acknowledgedAt">>,
): Promise<TeacherNotification | null> {
  const state = ensureState();
  const target = state.notifications.find((notification) => notification.id === notificationId);
  if (!target) return null;

  if (typeof updates.read === "boolean") {
    target.read = updates.read;
    if (updates.read && !target.acknowledgedAt) {
      target.acknowledgedAt = new Date().toISOString();
    }
  }
  if (typeof updates.acknowledgedAt === "string") {
    target.acknowledgedAt = updates.acknowledgedAt;
  }

  state.lastSync = new Date().toISOString();
  return clone(target);
}

export async function listTeacherSchedule(): Promise<TeacherScheduleItem[]> {
  const state = ensureState();
  return clone(
    state.schedule
      .slice()
      .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime)),
  );
}

export async function addTeacherScheduleItem(payload: {
  title: string;
  type: ScheduleType;
  startTime: string;
  endTime: string;
  location: string;
  classId?: string;
  notes?: string;
}): Promise<TeacherScheduleItem> {
  const state = ensureState();
  const item: TeacherScheduleItem = {
    id: `sch-${randomUUID()}`,
    title: payload.title,
    type: payload.type,
    startTime: payload.startTime,
    endTime: payload.endTime,
    location: payload.location,
    classId: payload.classId,
    notes: payload.notes,
  };
  state.schedule.push(item);
  state.lastSync = new Date().toISOString();
  return clone(item);
}

async function resolveTeacherProfile(): Promise<UserRecord | null> {
  try {
    return await dbManager.getUser(TEACHER_USER_ID);
  } catch {
    return null;
  }
}

export async function getTeacherProfile(): Promise<TeacherProfile> {
  const state = ensureState();
  const [user, classes] = await Promise.all([resolveTeacherProfile(), dbManager.getClasses()]);
  const teacherClasses = classes.filter((klass) => klass.classTeacherId === TEACHER_USER_ID);
  const firstClass = teacherClasses[0]?.name ?? state.profileFallback.formTeacherOf;

  const subjects = Array.isArray(user?.subjects) && user?.subjects.length
    ? [...(user?.subjects ?? [])]
    : state.profileFallback.subjects;

  return {
    id: user?.id ?? state.profileFallback.id,
    name: user?.name ?? state.profileFallback.name,
    email: user?.email ?? state.profileFallback.email,
    avatar: state.profileFallback.avatar,
    subjects,
    formTeacherOf: firstClass ?? undefined,
    yearsOfExperience: state.profileFallback.yearsOfExperience,
  };
}
