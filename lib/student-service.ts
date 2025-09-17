import { randomUUID } from "crypto";

type ScheduleType = "class" | "exam" | "activity" | "deadline";

type StudentAssignmentStatus = "assigned" | "in-progress" | "submitted" | "graded" | "overdue";

type StudentNotificationLevel = "info" | "success" | "warning" | "critical";

type StudentSupportStatus = "open" | "in-progress" | "resolved";

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  programme: string;
  cohort: string;
  gpa: number;
  creditsCompleted: number;
  creditsRequired: number;
  advisorName: string;
  contactPhone: string;
}

export interface StudentCourse {
  id: string;
  name: string;
  teacher: string;
  creditHours: number;
  progress: number;
  currentGrade: string;
  attendanceRate: number;
  nextSession: {
    topic: string;
    startTime: string;
    location: string;
  };
  supportResources: string[];
}

export interface StudentAssignment {
  id: string;
  courseId: string;
  title: string;
  type: "homework" | "project" | "quiz" | "essay";
  dueDate: string;
  status: StudentAssignmentStatus;
  progress: number;
  submittedAt?: string;
  grade?: string;
  feedback?: string;
  resources?: string[];
}

export interface StudentGrade {
  id: string;
  courseId: string;
  courseName: string;
  assessment: string;
  score: number;
  maxScore: number;
  weight: number;
  grade: string;
  remarks?: string;
  issuedAt: string;
}

export interface StudentAttendanceRecord {
  id: string;
  courseId: string;
  courseName: string;
  totalSessions: number;
  attended: number;
  attendanceRate: number;
  lastAbsentDate?: string;
}

export interface StudentScheduleItem {
  id: string;
  title: string;
  type: ScheduleType;
  startTime: string;
  endTime: string;
  location: string;
  courseId?: string;
  description?: string;
}

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  level: StudentNotificationLevel;
  read: boolean;
  actionUrl?: string;
  archivedAt?: string;
}

export interface StudentSupportRequest {
  id: string;
  topic: string;
  description: string;
  status: StudentSupportStatus;
  createdAt: string;
  lastUpdated: string;
  updates: Array<{
    id: string;
    author: "student" | "advisor";
    message: string;
    timestamp: string;
  }>;
}

export interface StudentFinancialOverview {
  pendingPayments: number;
  balance: number;
  upcomingDueDate: string;
  scholarshipPercentage: number;
  lastPaymentDate: string;
}

export interface StudentDashboardMetrics {
  assignmentsDue: number;
  notices: number;
  paymentsPending: number;
  lastSync: string;
}

interface StudentState {
  profile: StudentProfile;
  courses: StudentCourse[];
  assignments: StudentAssignment[];
  grades: StudentGrade[];
  attendance: StudentAttendanceRecord[];
  schedule: StudentScheduleItem[];
  notifications: StudentNotification[];
  supportRequests: StudentSupportRequest[];
  financial: StudentFinancialOverview;
  lastSync: string;
}

const GLOBAL_KEY = "__veaStudentState";

type WithStudentState = typeof globalThis & { [GLOBAL_KEY]?: StudentState };

function getGlobal(): WithStudentState {
  return globalThis as WithStudentState;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function seedState(): StudentState {
  const now = new Date();
  const iso = (date: Date) => date.toISOString();
  const daysFromNow = (days: number, hours = 9, minutes = 0) => {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + days);
    d.setHours(hours, minutes, 0, 0);
    return d;
  };

  const profile: StudentProfile = {
    id: "stu-vea-001",
    name: "Adaora Nwachukwu",
    email: "adaora.nwachukwu@portal.vea.ng",
    avatar: undefined,
    programme: "Science & Technology",
    cohort: "SS2 - Blue House",
    gpa: 3.72,
    creditsCompleted: 48,
    creditsRequired: 72,
    advisorName: "Mr. Ibrahim Musa",
    contactPhone: "+234 803 123 4567",
  };

  const courses: StudentCourse[] = [
    {
      id: "crs-mat-401",
      name: "Advanced Mathematics",
      teacher: "Mrs. Bisi Ajayi",
      creditHours: 4,
      progress: 0.78,
      currentGrade: "A-",
      attendanceRate: 0.94,
      nextSession: {
        topic: "Differential Calculus Applications",
        startTime: iso(daysFromNow(1, 8, 0)),
        location: "Block B - Math Lab",
      },
      supportResources: [
        "https://vea.ng/resources/mathematics/differential-calculus",
        "https://vea.ng/resources/mathematics/study-plan",
      ],
    },
    {
      id: "crs-phy-305",
      name: "Physics: Electricity & Magnetism",
      teacher: "Engr. Henry Oladipo",
      creditHours: 3,
      progress: 0.64,
      currentGrade: "B+",
      attendanceRate: 0.9,
      nextSession: {
        topic: "Lab: Building Simple Circuits",
        startTime: iso(daysFromNow(0, 13, 0)),
        location: "Science Hub Lab 2",
      },
      supportResources: [
        "https://vea.ng/resources/physics/circuit-lab-guide",
        "https://vea.ng/resources/physics/video-series",
      ],
    },
    {
      id: "crs-ict-220",
      name: "Information & Communication Technology",
      teacher: "Ms. Hauwa Bala",
      creditHours: 2,
      progress: 0.82,
      currentGrade: "A",
      attendanceRate: 0.98,
      nextSession: {
        topic: "Group Project Sprint Planning",
        startTime: iso(daysFromNow(2, 11, 0)),
        location: "Innovation Studio",
      },
      supportResources: [
        "https://vea.ng/resources/ict/project-rubric",
        "https://vea.ng/resources/ict/collaboration-tools",
      ],
    },
    {
      id: "crs-eng-150",
      name: "English Composition",
      teacher: "Mrs. Bola Jegede",
      creditHours: 3,
      progress: 0.71,
      currentGrade: "B",
      attendanceRate: 0.97,
      nextSession: {
        topic: "Peer Review Workshop",
        startTime: iso(daysFromNow(3, 10, 0)),
        location: "Literature Studio",
      },
      supportResources: [
        "https://vea.ng/resources/english/essay-checklist",
        "https://vea.ng/resources/english/peer-review-guide",
      ],
    },
  ];

  const assignments: StudentAssignment[] = [
    {
      id: "asn-mat-908",
      courseId: "crs-mat-401",
      title: "Problem Set 5: Optimization",
      type: "homework",
      dueDate: iso(daysFromNow(2, 23, 59)),
      status: "assigned",
      progress: 0.2,
      resources: ["https://vea.ng/resources/mathematics/optimization-notes.pdf"],
    },
    {
      id: "asn-phy-744",
      courseId: "crs-phy-305",
      title: "Lab Report: Circuit Analysis",
      type: "project",
      dueDate: iso(daysFromNow(1, 18, 0)),
      status: "in-progress",
      progress: 0.6,
      resources: ["https://vea.ng/resources/physics/lab-report-template.docx"],
    },
    {
      id: "asn-ict-312",
      courseId: "crs-ict-220",
      title: "Sprint 2 Demo Submission",
      type: "project",
      dueDate: iso(daysFromNow(4, 21, 0)),
      status: "assigned",
      progress: 0.15,
      resources: ["https://vea.ng/resources/ict/project-sprint-scope"],
    },
    {
      id: "asn-eng-115",
      courseId: "crs-eng-150",
      title: "Comparative Essay Draft",
      type: "essay",
      dueDate: iso(daysFromNow(-1, 17, 0)),
      status: "overdue",
      progress: 0.4,
      feedback: "Draft received needs stronger thesis statement.",
    },
    {
      id: "asn-mat-871",
      courseId: "crs-mat-401",
      title: "Quiz 4 Reflection",
      type: "quiz",
      dueDate: iso(daysFromNow(-3, 23, 59)),
      status: "graded",
      progress: 1,
      submittedAt: iso(daysFromNow(-4, 19, 0)),
      grade: "A",
      feedback: "Excellent understanding of integration techniques.",
    },
  ];

  const grades: StudentGrade[] = [
    {
      id: "grd-mat-004",
      courseId: "crs-mat-401",
      courseName: "Advanced Mathematics",
      assessment: "Quiz 4",
      score: 18,
      maxScore: 20,
      weight: 0.1,
      grade: "A",
      remarks: "Strong reasoning on optimisation problems.",
      issuedAt: iso(daysFromNow(-2, 15, 0)),
    },
    {
      id: "grd-phy-008",
      courseId: "crs-phy-305",
      courseName: "Physics: Electricity & Magnetism",
      assessment: "Practical Assessment",
      score: 42,
      maxScore: 50,
      weight: 0.15,
      grade: "B+",
      remarks: "Demonstrated clear understanding, improve report structure.",
      issuedAt: iso(daysFromNow(-5, 14, 0)),
    },
    {
      id: "grd-eng-003",
      courseId: "crs-eng-150",
      courseName: "English Composition",
      assessment: "Essay Draft",
      score: 32,
      maxScore: 40,
      weight: 0.1,
      grade: "B",
      remarks: "Great narrative flow, watch grammar in conclusion.",
      issuedAt: iso(daysFromNow(-7, 12, 0)),
    },
  ];

  const attendance: StudentAttendanceRecord[] = courses.map((course, index) => {
    const totalSessions = 32 + index * 2;
    const attended = Math.round(totalSessions * course.attendanceRate);
    return {
      id: `att-${course.id}`,
      courseId: course.id,
      courseName: course.name,
      totalSessions,
      attended,
      attendanceRate: attended / totalSessions,
      lastAbsentDate: index === 1 ? iso(daysFromNow(-6, 8, 0)) : undefined,
    };
  });

  const schedule: StudentScheduleItem[] = [
    {
      id: "sch-1",
      title: "Physics Lab: Circuit Assembly",
      type: "class",
      startTime: iso(daysFromNow(0, 13, 0)),
      endTime: iso(daysFromNow(0, 15, 0)),
      location: "Science Hub Lab 2",
      courseId: "crs-phy-305",
      description: "Hands-on session building series and parallel circuits.",
    },
    {
      id: "sch-2",
      title: "Mathematics Tutorial",
      type: "class",
      startTime: iso(daysFromNow(1, 8, 0)),
      endTime: iso(daysFromNow(1, 9, 30)),
      location: "Block B - Math Lab",
      courseId: "crs-mat-401",
      description: "Focused revision on optimisation problems ahead of assignment due date.",
    },
    {
      id: "sch-3",
      title: "ICT Project Stand-up",
      type: "activity",
      startTime: iso(daysFromNow(2, 11, 0)),
      endTime: iso(daysFromNow(2, 12, 0)),
      location: "Innovation Studio",
      courseId: "crs-ict-220",
      description: "Sprint alignment with project mentor.",
    },
    {
      id: "sch-4",
      title: "English Composition Peer Review",
      type: "class",
      startTime: iso(daysFromNow(3, 10, 0)),
      endTime: iso(daysFromNow(3, 11, 30)),
      location: "Literature Studio",
      courseId: "crs-eng-150",
      description: "Peer feedback session on comparative essays.",
    },
    {
      id: "sch-5",
      title: "Mathematics Assignment Submission Deadline",
      type: "deadline",
      startTime: iso(daysFromNow(2, 23, 59)),
      endTime: iso(daysFromNow(2, 23, 59)),
      location: "VEA LMS Portal",
      courseId: "crs-mat-401",
      description: "Ensure optimisation problem set is uploaded before midnight.",
    },
  ];

  const notifications: StudentNotification[] = [
    {
      id: "ntf-001",
      title: "Mathematics assignment due in 2 days",
      message: "Problem Set 5 submission closes on Thursday 11:59 PM.",
      timestamp: iso(daysFromNow(0, 7, 30)),
      level: "warning",
      read: false,
      actionUrl: "https://vea.ng/lms/assignments/asn-mat-908",
    },
    {
      id: "ntf-002",
      title: "Physics lab safety reminder",
      message: "Remember to wear lab coats and closed shoes for today's session.",
      timestamp: iso(daysFromNow(0, 9, 0)),
      level: "info",
      read: true,
    },
    {
      id: "ntf-003",
      title: "Tuition instalment pending",
      message: "Second term instalment of ₦45,000 is due next week.",
      timestamp: iso(daysFromNow(-1, 16, 30)),
      level: "critical",
      read: false,
      actionUrl: "https://vea.ng/payments",
    },
  ];

  const supportRequests: StudentSupportRequest[] = [
    {
      id: "sup-001",
      topic: "Clarification on physics lab report",
      description: "Need guidance on structuring the discussion section for the circuit analysis lab report.",
      status: "in-progress",
      createdAt: iso(daysFromNow(-4, 10, 15)),
      lastUpdated: iso(daysFromNow(-1, 9, 0)),
      updates: [
        {
          id: "sup-001-msg-1",
          author: "student",
          message: "Could you share an example from last term's cohort?",
          timestamp: iso(daysFromNow(-4, 10, 15)),
        },
        {
          id: "sup-001-msg-2",
          author: "advisor",
          message: "Sure, please review the sample uploaded in the resources drive.",
          timestamp: iso(daysFromNow(-2, 14, 45)),
        },
      ],
    },
    {
      id: "sup-002",
      topic: "Request for additional maths coaching",
      description: "Looking to join the evening maths clinic ahead of exams.",
      status: "open",
      createdAt: iso(daysFromNow(-2, 18, 20)),
      lastUpdated: iso(daysFromNow(-2, 18, 20)),
      updates: [
        {
          id: "sup-002-msg-1",
          author: "student",
          message: "Available on Tuesdays and Thursdays after 4pm.",
          timestamp: iso(daysFromNow(-2, 18, 20)),
        },
      ],
    },
  ];

  const financial: StudentFinancialOverview = {
    pendingPayments: 1,
    balance: 45000,
    upcomingDueDate: iso(daysFromNow(6, 17, 0)),
    scholarshipPercentage: 25,
    lastPaymentDate: iso(daysFromNow(-35, 10, 0)),
  };

  return {
    profile,
    courses,
    assignments,
    grades,
    attendance,
    schedule,
    notifications,
    supportRequests,
    financial,
    lastSync: now.toISOString(),
  };
}

function ensureState(): StudentState {
  const global = getGlobal();
  if (!global[GLOBAL_KEY]) {
    global[GLOBAL_KEY] = seedState();
  }
  return global[GLOBAL_KEY]!;
}

function writeState(next: StudentState) {
  const global = getGlobal();
  global[GLOBAL_KEY] = next;
}

function touch(state: StudentState) {
  state.lastSync = new Date().toISOString();
}

export function getStudentProfile(): StudentProfile {
  return clone(ensureState().profile);
}

export function getStudentFinancialOverview(): StudentFinancialOverview {
  return clone(ensureState().financial);
}

export function listStudentCourses(): StudentCourse[] {
  return clone(ensureState().courses);
}

export function listStudentAssignments(): StudentAssignment[] {
  return clone(ensureState().assignments);
}

export function listStudentGrades(): StudentGrade[] {
  return clone(ensureState().grades);
}

export function listStudentAttendance(): StudentAttendanceRecord[] {
  return clone(ensureState().attendance);
}

export function listStudentSchedule(): StudentScheduleItem[] {
  const items = ensureState().schedule.slice().sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  return clone(items);
}

export function listStudentNotifications(includeArchived = false): StudentNotification[] {
  const { notifications } = ensureState();
  const filtered = includeArchived ? notifications : notifications.filter((item) => !item.archivedAt);
  const sorted = filtered.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return clone(sorted);
}

export function listStudentSupportRequests(): StudentSupportRequest[] {
  const { supportRequests } = ensureState();
  const sorted = supportRequests.slice().sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
  return clone(sorted);
}

export function getStudentDashboardMetrics(): StudentDashboardMetrics {
  const state = ensureState();
  const now = Date.now();
  const assignmentsDue = state.assignments.filter((assignment) => {
    if (assignment.status === "submitted" || assignment.status === "graded") {
      return false;
    }
    const dueTime = new Date(assignment.dueDate).getTime();
    return Number.isFinite(dueTime) && dueTime >= now - 24 * 60 * 60 * 1000;
  }).length;

  const notices = state.notifications.filter((notification) => !notification.read && !notification.archivedAt).length;

  return {
    assignmentsDue,
    notices,
    paymentsPending: Math.max(0, state.financial.pendingPayments),
    lastSync: state.lastSync,
  };
}

interface StudentAssignmentUpdate {
  status?: StudentAssignmentStatus;
  progress?: number;
  submissionLink?: string;
  notes?: string;
}

export function updateStudentAssignment(id: string, updates: StudentAssignmentUpdate): StudentAssignment {
  const state = ensureState();
  const assignmentIndex = state.assignments.findIndex((assignment) => assignment.id === id);
  if (assignmentIndex === -1) {
    throw new Error("Assignment not found");
  }

  const assignment = state.assignments[assignmentIndex];
  const next = { ...assignment };

  if (typeof updates.status === "string") {
    next.status = updates.status;
  }
  if (typeof updates.progress === "number" && Number.isFinite(updates.progress)) {
    next.progress = parseFloat(clamp(updates.progress, 0, 1).toFixed(2));
  }
  if (updates.status === "submitted" && !next.submittedAt) {
    next.submittedAt = new Date().toISOString();
    next.progress = 1;
  }
  if (typeof updates.submissionLink === "string") {
    next.feedback = `Submitted via portal: ${updates.submissionLink.trim()}`;
  }
  if (typeof updates.notes === "string" && updates.notes.trim()) {
    next.feedback = updates.notes.trim();
  }

  state.assignments[assignmentIndex] = next;
  touch(state);
  writeState(state);
  return clone(next);
}

interface NotificationUpdate {
  read?: boolean;
  archived?: boolean;
}

export function updateStudentNotification(id: string, update: NotificationUpdate): StudentNotification {
  const state = ensureState();
  const notificationIndex = state.notifications.findIndex((notification) => notification.id === id);
  if (notificationIndex === -1) {
    throw new Error("Notification not found");
  }

  const notification = state.notifications[notificationIndex];
  const next: StudentNotification = { ...notification };

  if (typeof update.read === "boolean") {
    next.read = update.read;
  }
  if (update.archived) {
    next.archivedAt = new Date().toISOString();
  }

  state.notifications[notificationIndex] = next;
  touch(state);
  writeState(state);
  return clone(next);
}

interface SupportRequestInput {
  topic: string;
  description: string;
}

export function createStudentSupportRequest(input: SupportRequestInput): StudentSupportRequest {
  const state = ensureState();
  const now = new Date().toISOString();
  const request: StudentSupportRequest = {
    id: randomUUID(),
    topic: input.topic,
    description: input.description,
    status: "open",
    createdAt: now,
    lastUpdated: now,
    updates: [
      {
        id: randomUUID(),
        author: "student",
        message: input.description,
        timestamp: now,
      },
    ],
  };

  state.supportRequests.unshift(request);
  touch(state);
  writeState(state);
  return clone(request);
}

interface SupportRequestUpdate {
  status?: StudentSupportStatus;
  message?: string;
}

export function updateStudentSupportRequest(id: string, update: SupportRequestUpdate): StudentSupportRequest {
  const state = ensureState();
  const index = state.supportRequests.findIndex((request) => request.id === id);
  if (index === -1) {
    throw new Error("Support request not found");
  }

  const request = state.supportRequests[index];
  const next: StudentSupportRequest = { ...request };

  if (typeof update.status === "string") {
    next.status = update.status;
  }

  if (typeof update.message === "string" && update.message.trim()) {
    const timestamp = new Date().toISOString();
    next.updates = [
      ...next.updates,
      {
        id: randomUUID(),
        author: "student",
        message: update.message.trim(),
        timestamp,
      },
    ];
    next.lastUpdated = timestamp;
  } else {
    next.lastUpdated = new Date().toISOString();
  }

  state.supportRequests[index] = next;
  touch(state);
  writeState(state);
  return clone(next);
}
