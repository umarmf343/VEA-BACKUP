import { randomUUID } from "crypto";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

type ScheduleType = "lesson" | "meeting" | "duty" | "event";

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

interface TeacherState {
  profile: TeacherProfile;
  classes: TeacherClass[];
  assignments: TeacherAssignment[];
  assessments: TeacherAssessment[];
  messages: TeacherMessage[];
  notifications: TeacherNotification[];
  schedule: TeacherScheduleItem[];
  lastSync: string;
}

const GLOBAL_KEY = "__veaTeacherState";

type WithTeacherState = typeof globalThis & { [GLOBAL_KEY]?: TeacherState };

function getGlobal(): WithTeacherState {
  return globalThis as WithTeacherState;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
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

  const classes: TeacherClass[] = [
    {
      id: "cls-mth-jss2a",
      name: "JSS 2 - A",
      level: "Junior Secondary 2",
      subject: "Mathematics",
      studentCount: 32,
      attendanceRate: 0.96,
      lastUpdated: today,
      nextLessonTopic: "Linear Equations and Graphs",
      schedule: [
        { day: "Monday", startTime: "08:00", endTime: "08:50", room: "Math Lab" },
        { day: "Wednesday", startTime: "10:00", endTime: "10:50", room: "Room 204" },
      ],
    },
    {
      id: "cls-mth-jss3b",
      name: "JSS 3 - B",
      level: "Junior Secondary 3",
      subject: "Mathematics",
      studentCount: 28,
      attendanceRate: 0.93,
      lastUpdated: today,
      nextLessonTopic: "Probability Fundamentals",
      schedule: [
        { day: "Tuesday", startTime: "09:00", endTime: "09:50", room: "Room 105" },
        { day: "Thursday", startTime: "11:00", endTime: "11:50", room: "Room 105" },
      ],
    },
    {
      id: "cls-sci-sss1a",
      name: "SSS 1 - A",
      level: "Senior Secondary 1",
      subject: "Physics",
      studentCount: 30,
      attendanceRate: 0.9,
      lastUpdated: today,
      nextLessonTopic: "Newton's Laws of Motion",
      schedule: [
        { day: "Monday", startTime: "12:00", endTime: "12:50", room: "Physics Lab" },
        { day: "Thursday", startTime: "09:00", endTime: "09:50", room: "Physics Lab" },
      ],
    },
  ];

  const assignments: TeacherAssignment[] = [
    {
      id: "asg-linear-equations",
      title: "Linear Equations Worksheet",
      description: "Complete the attached worksheet on solving two-step linear equations.",
      classId: "cls-mth-jss2a",
      dueDate: startOfDay(2, 14),
      status: "assigned",
      submissionsPending: 12,
      submissionsGraded: 20,
      resources: ["worksheet-linear-equations.pdf"],
      lastUpdated: today,
    },
    {
      id: "asg-probability-project",
      title: "Probability Group Project",
      description: "Group project exploring probability in real-world scenarios.",
      classId: "cls-mth-jss3b",
      dueDate: startOfDay(5, 16),
      status: "draft",
      submissionsPending: 0,
      submissionsGraded: 0,
      resources: ["probability-project-guide.docx"],
      lastUpdated: today,
    },
    {
      id: "asg-kinematics-quiz",
      title: "Kinematics Quiz",
      description: "Short quiz covering speed, velocity, and acceleration.",
      classId: "cls-sci-sss1a",
      dueDate: startOfDay(-1, 10),
      status: "submitted",
      submissionsPending: 18,
      submissionsGraded: 12,
      lastUpdated: today,
    },
  ];

  const assessments: TeacherAssessment[] = [
    {
      id: "asm-grace-quiz2",
      classId: "cls-mth-jss2a",
      title: "Quiz 2 - Linear Equations",
      type: "quiz",
      studentName: "Grace Okafor",
      submittedAt: startOfDay(0, 7, 45),
      dueDate: startOfDay(0, 8),
      status: "pending",
      remarks: "Check workings for question 4",
    },
    {
      id: "asm-king-project",
      classId: "cls-mth-jss3b",
      title: "Probability Project - Group 3",
      type: "project",
      studentName: "Group 3",
      submittedAt: startOfDay(-1, 15, 30),
      dueDate: startOfDay(-1, 16),
      status: "in-review",
      remarks: "Verify experimental data.",
    },
    {
      id: "asm-sss1a-midterm",
      classId: "cls-sci-sss1a",
      title: "Mid-term Test",
      type: "test",
      studentName: "Class Submission",
      submittedAt: startOfDay(-3, 11),
      dueDate: startOfDay(-3, 11),
      status: "pending",
      remarks: "Moderate grades with rubric",
    },
  ];

  const messages: TeacherMessage[] = [
    {
      id: "msg-parent-grace",
      subject: "Grace - Homework follow up",
      preview: "Could you please share how Grace is coping with the new maths topics?",
      body: "Good day, please how is Grace adapting to the new mathematics topics? We would love to support her at home.",
      sentAt: startOfDay(-1, 18),
      sender: "Mrs. Okafor (Parent)",
      recipients: ["Mrs. Sarah Johnson"],
      read: false,
    },
    {
      id: "msg-hod-physics",
      subject: "Physics Lab Maintenance",
      preview: "Reminder: Update the lab checklist before Friday.",
      body: "Please ensure the physics lab equipment checklist is updated before the safety inspection on Friday.",
      sentAt: startOfDay(-2, 9, 30),
      sender: "Head of Science Department",
      recipients: ["Mrs. Sarah Johnson"],
      read: true,
    },
    {
      id: "msg-admin-meeting",
      subject: "Curriculum Review Meeting",
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
      id: "ntf-attendance",
      title: "Attendance alert",
      message: "JSS 3B attendance dropped below 90% this week.",
      timestamp: startOfDay(-1, 14),
      level: "warning",
      read: false,
      actionUrl: "/teacher/classes/cls-mth-jss3b",
    },
    {
      id: "ntf-submission",
      title: "New assignment submission",
      message: "4 new submissions received for Kinematics Quiz.",
      timestamp: startOfDay(0, 6, 45),
      level: "info",
      read: false,
    },
    {
      id: "ntf-meeting",
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
      id: "sch-jss2a-monday",
      title: "Mathematics - JSS2A",
      type: "lesson",
      startTime: startOfDay(0, 8),
      endTime: startOfDay(0, 8, 50),
      location: "Math Lab",
      classId: "cls-mth-jss2a",
      notes: "Introduce graphing of linear equations.",
    },
    {
      id: "sch-jss3b-tuesday",
      title: "Mathematics - JSS3B",
      type: "lesson",
      startTime: startOfDay(1, 9),
      endTime: startOfDay(1, 9, 50),
      location: "Room 105",
      classId: "cls-mth-jss3b",
      notes: "Probability tree diagrams.",
    },
    {
      id: "sch-sss1a-thursday",
      title: "Physics - SSS1A",
      type: "lesson",
      startTime: startOfDay(3, 9),
      endTime: startOfDay(3, 9, 50),
      location: "Physics Lab",
      classId: "cls-sci-sss1a",
      notes: "Conduct practical on motion sensors.",
    },
    {
      id: "sch-dept-meeting",
      title: "Science department strategy",
      type: "meeting",
      startTime: startOfDay(2, 15),
      endTime: startOfDay(2, 16, 30),
      location: "Conference Room B",
      notes: "Align on lab improvements.",
    },
  ];

  return {
    profile: {
      id: "teacher-sarah-johnson",
      name: "Mrs. Sarah Johnson",
      email: "sarah.johnson@vea.edu.ng",
      avatar: "/avatars/teacher-sarah.png",
      subjects: ["Mathematics", "Physics"],
      formTeacherOf: "JSS 2A",
      yearsOfExperience: 9,
    },
    classes,
    assignments,
    assessments,
    messages,
    notifications,
    schedule,
    lastSync: today,
  };
}

function ensureState(): TeacherState {
  const g = getGlobal();
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = seedState();
  }
  return g[GLOBAL_KEY]!;
}

export function getTeacherDashboardMetrics(): TeacherDashboardMetrics {
  const state = ensureState();
  const pendingMarks = state.assessments.filter((a) => a.status !== "completed").length;
  const assignments = state.assignments.filter((a) => a.status === "assigned" || a.status === "submitted").length;
  const messages = state.messages.filter((m) => !m.read && !m.archived).length;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const upcomingLessons = state.schedule.filter((item) => {
    const start = Date.parse(item.startTime);
    return start >= now && start <= now + sevenDays && item.type === "lesson";
  }).length;

  const attendanceRates = state.classes.map((c) => c.attendanceRate);
  const averageAttendance = attendanceRates.length
    ? attendanceRates.reduce((sum, rate) => sum + rate, 0) / attendanceRates.length
    : 0;

  const totalSubmissions = state.assignments.reduce(
    (acc, assignment) => acc + assignment.submissionsGraded + assignment.submissionsPending,
    0
  );
  const totalGraded = state.assignments.reduce((acc, assignment) => acc + assignment.submissionsGraded, 0);
  const gradeCompletion = totalSubmissions > 0 ? totalGraded / totalSubmissions : 0;

  return {
    pendingMarks,
    assignments,
    messages,
    upcomingLessons,
    averageAttendance: Number(averageAttendance.toFixed(2)),
    gradeCompletion: Number(gradeCompletion.toFixed(2)),
    lastSync: state.lastSync,
  };
}

export function listTeacherClasses(): TeacherClass[] {
  return clone(ensureState().classes);
}

export function listTeacherAssignments(): TeacherAssignment[] {
  const state = ensureState();
  return clone(state.assignments.sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate)));
}

export function createTeacherAssignment(payload: {
  title: string;
  description?: string;
  classId: string;
  dueDate: string;
  resources?: string[];
}): TeacherAssignment {
  const state = ensureState();
  const assignment: TeacherAssignment = {
    id: `asg-${randomUUID()}`,
    title: payload.title,
    description: payload.description ?? "",
    classId: payload.classId,
    dueDate: payload.dueDate,
    status: "assigned",
    submissionsPending: 0,
    submissionsGraded: 0,
    resources: payload.resources,
    lastUpdated: new Date().toISOString(),
  };
  state.assignments.push(assignment);
  state.lastSync = new Date().toISOString();
  return clone(assignment);
}

export function updateTeacherAssignment(
  assignmentId: string,
  updates: Partial<Pick<TeacherAssignment, "status" | "submissionsPending" | "submissionsGraded" | "description" | "dueDate">>
): TeacherAssignment | null {
  const state = ensureState();
  const target = state.assignments.find((assignment) => assignment.id === assignmentId);
  if (!target) return null;

  if (typeof updates.status === "string") {
    target.status = updates.status;
  }
  if (typeof updates.submissionsPending === "number") {
    target.submissionsPending = Math.max(0, updates.submissionsPending);
  }
  if (typeof updates.submissionsGraded === "number") {
    target.submissionsGraded = Math.max(0, updates.submissionsGraded);
  }
  if (typeof updates.description === "string") {
    target.description = updates.description;
  }
  if (typeof updates.dueDate === "string") {
    target.dueDate = updates.dueDate;
  }
  target.lastUpdated = new Date().toISOString();
  state.lastSync = target.lastUpdated;
  return clone(target);
}

export function listTeacherAssessments(): TeacherAssessment[] {
  const state = ensureState();
  return clone(state.assessments.sort((a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt)));
}

export function updateTeacherAssessment(
  assessmentId: string,
  updates: Partial<Pick<TeacherAssessment, "status" | "remarks">>
): TeacherAssessment | null {
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

export function listTeacherMessages(): TeacherMessage[] {
  return clone(
    ensureState()
      .messages.slice()
      .sort((a, b) => Date.parse(b.sentAt) - Date.parse(a.sentAt))
  );
}

export function sendTeacherMessage(payload: {
  subject: string;
  body: string;
  recipients: string[];
}): TeacherMessage {
  const state = ensureState();
  const now = new Date().toISOString();
  const message: TeacherMessage = {
    id: `msg-${randomUUID()}`,
    subject: payload.subject,
    preview: payload.body.slice(0, 120),
    body: payload.body,
    sentAt: now,
    sender: state.profile.name,
    recipients: payload.recipients,
    read: true,
  };
  state.messages.unshift(message);
  state.lastSync = now;
  return clone(message);
}

export function updateTeacherMessage(
  messageId: string,
  updates: Partial<Pick<TeacherMessage, "read" | "archived">>
): TeacherMessage | null {
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

export function listTeacherNotifications(): TeacherNotification[] {
  const state = ensureState();
  return clone(
    state.notifications.slice().sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
  );
}

export function updateTeacherNotification(
  notificationId: string,
  updates: Partial<Pick<TeacherNotification, "read" | "acknowledgedAt">>
): TeacherNotification | null {
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

export function listTeacherSchedule(): TeacherScheduleItem[] {
  const state = ensureState();
  return clone(
    state.schedule.slice().sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  );
}

export function addTeacherScheduleItem(payload: {
  title: string;
  type: ScheduleType;
  startTime: string;
  endTime: string;
  location: string;
  classId?: string;
  notes?: string;
}): TeacherScheduleItem {
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

export function getTeacherProfile(): TeacherProfile {
  return clone(ensureState().profile);
}
