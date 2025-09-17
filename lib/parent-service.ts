import { randomUUID } from "crypto";

type NotificationStatus = "new" | "read" | "archived";
type MeetingStatus = "scheduled" | "awaiting-confirmation" | "completed" | "cancelled";
type PaymentStatus = "processing" | "completed" | "failed";
type SupportStatus = "open" | "in-progress" | "resolved";
type AssignmentStatus = "pending" | "submitted" | "graded";

type AttendanceBand = "excellent" | "good" | "watch" | "at-risk";

type PaymentMethod = "bank-transfer" | "card" | "cash";

type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";

export interface ParentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  guardianType: "Mother" | "Father" | "Guardian";
  preferredContactMethod: "email" | "sms" | "phone" | "portal";
}

export interface ParentAssignmentPreview {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  status: AssignmentStatus;
  lastUpdated: string;
}

export interface ParentGradeSnapshot {
  id: string;
  course: string;
  assessment: string;
  score: number;
  total: number;
  recordedAt: string;
  teacher: string;
}

export interface ParentStudent {
  id: string;
  name: string;
  level: string;
  advisor: string;
  advisorEmail: string;
  homeroom: string;
  currentTermAverage: number;
  attendanceRate: number;
  behaviourRating: AttendanceBand;
  upcomingAssignments: ParentAssignmentPreview[];
  recentGrades: ParentGradeSnapshot[];
}

export interface ParentAttendanceRecord {
  id: string;
  studentId: string;
  weekOf: string;
  attendancePercentage: number;
  tardies: number;
  absences: number;
  remarks?: string;
}

export interface ParentPayment {
  id: string;
  studentId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string;
  processedAt: string;
  notes?: string;
}

export interface ParentFinancialAccount {
  id: string;
  studentId: string;
  planType: "termly" | "monthly";
  balance: number;
  scholarshipPercentage: number;
  lastPaymentDate: string;
  upcomingDueDate: string;
  payments: ParentPayment[];
}

export interface ParentNotification {
  id: string;
  title: string;
  message: string;
  category: "academic" | "finance" | "schedule" | "community" | "behaviour";
  status: NotificationStatus;
  createdAt: string;
  actionUrl?: string;
}

export interface ParentMeeting {
  id: string;
  studentId: string;
  staffName: string;
  staffRole: string;
  scheduledFor: string;
  agenda: string;
  location: "in-person" | "virtual";
  status: MeetingStatus;
  createdAt: string;
  notes?: string;
}

export interface ParentSupportMessage {
  id: string;
  author: "Parent" | "School";
  body: string;
  sentAt: string;
}

export interface ParentSupportThread {
  id: string;
  subject: string;
  studentId?: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  messages: ParentSupportMessage[];
}

export interface ParentDashboardMetrics {
  assignmentsDue: number;
  upcomingMeetings: number;
  unreadNotifications: number;
  outstandingBalance: number;
}

interface ParentState {
  profile: ParentProfile;
  students: ParentStudent[];
  attendance: ParentAttendanceRecord[];
  financials: ParentFinancialAccount[];
  notifications: ParentNotification[];
  meetings: ParentMeeting[];
  supportThreads: ParentSupportThread[];
}

const GLOBAL_KEY = "__veaParentState";

type WithParentState = typeof globalThis & { [GLOBAL_KEY]?: ParentState };

function getGlobal(): WithParentState {
  return globalThis as WithParentState;
}

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function seedState(): ParentState {
  const now = new Date();
  const formatISO = (offsetDays: number, hour = 9, minute = 0) => {
    const d = new Date(now.getTime());
    d.setDate(d.getDate() + offsetDays);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const profile: ParentProfile = {
    id: "parent-adeola-001",
    name: "Mrs. Adeola Bankole",
    email: "adeola.bankole@vea.edu.ng",
    phone: "+234-803-555-9087",
    address: "14 Orchid Close, Lekki Phase 1, Lagos",
    timezone: "Africa/Lagos",
    guardianType: "Mother",
    preferredContactMethod: "portal",
  };

  const students: ParentStudent[] = [
    {
      id: "student-damilola",
      name: "Damilola Bankole",
      level: "Junior Secondary 3",
      advisor: "Mrs. Bisi Olatunji",
      advisorEmail: "bisi.olatunji@vea.edu.ng",
      homeroom: "JSS3B",
      currentTermAverage: 86,
      attendanceRate: 0.94,
      behaviourRating: "good",
      upcomingAssignments: [
        {
          id: "asg-jss3-english-oral",
          title: "Oral English Presentation",
          course: "English Language",
          dueDate: formatISO(3, 11),
          status: "pending",
          lastUpdated: now.toISOString(),
        },
        {
          id: "asg-jss3-math-probability",
          title: "Probability Revision Quiz",
          course: "Mathematics",
          dueDate: formatISO(5, 10),
          status: "pending",
          lastUpdated: now.toISOString(),
        },
      ],
      recentGrades: [
        {
          id: "grade-dami-chem-midterm",
          course: "Basic Science",
          assessment: "Midterm Exam",
          score: 84,
          total: 100,
          recordedAt: formatISO(-6),
          teacher: "Mr. Chinedu Okeke",
        },
        {
          id: "grade-dami-english-oral",
          course: "English Language",
          assessment: "Oral Assessment",
          score: 18,
          total: 20,
          recordedAt: formatISO(-3),
          teacher: "Mrs. Bisi Olatunji",
        },
      ],
    },
    {
      id: "student-ayomide",
      name: "Ayomide Bankole",
      level: "Senior Secondary 1",
      advisor: "Mr. Kola Balogun",
      advisorEmail: "kola.balogun@vea.edu.ng",
      homeroom: "SS1A",
      currentTermAverage: 91,
      attendanceRate: 0.97,
      behaviourRating: "excellent",
      upcomingAssignments: [
        {
          id: "asg-ss1-physics-project",
          title: "Forces in Daily Life Project",
          course: "Physics",
          dueDate: formatISO(7, 14),
          status: "pending",
          lastUpdated: now.toISOString(),
        },
        {
          id: "asg-ss1-literature-essay",
          title: "Literature Essay Draft",
          course: "Literature in English",
          dueDate: formatISO(2, 9),
          status: "submitted",
          lastUpdated: formatISO(-1),
        },
      ],
      recentGrades: [
        {
          id: "grade-ayo-math-quiz",
          course: "Mathematics",
          assessment: "Quadratic Equations Quiz",
          score: 45,
          total: 50,
          recordedAt: formatISO(-2),
          teacher: "Mrs. Sade Ogun",
        },
        {
          id: "grade-ayo-physics-lab",
          course: "Physics",
          assessment: "Laboratory Report",
          score: 27,
          total: 30,
          recordedAt: formatISO(-4),
          teacher: "Mr. Kola Balogun",
        },
      ],
    },
  ];

  const attendance: ParentAttendanceRecord[] = [
    {
      id: "att-dami-wk36",
      studentId: "student-damilola",
      weekOf: formatISO(-14),
      attendancePercentage: 0.92,
      tardies: 1,
      absences: 1,
      remarks: "Late arrival due to traffic on Monday.",
    },
    {
      id: "att-dami-wk37",
      studentId: "student-damilola",
      weekOf: formatISO(-7),
      attendancePercentage: 0.95,
      tardies: 0,
      absences: 1,
      remarks: "Approved absence for medical appointment.",
    },
    {
      id: "att-ayo-wk36",
      studentId: "student-ayomide",
      weekOf: formatISO(-14),
      attendancePercentage: 0.98,
      tardies: 0,
      absences: 0,
    },
    {
      id: "att-ayo-wk37",
      studentId: "student-ayomide",
      weekOf: formatISO(-7),
      attendancePercentage: 0.96,
      tardies: 0,
      absences: 1,
      remarks: "Participated in national science competition.",
    },
  ];

  const paymentsDamilola: ParentPayment[] = [
    {
      id: "pay-dami-jan",
      studentId: "student-damilola",
      amount: 120000,
      method: "bank-transfer",
      status: "completed",
      reference: "VEA-TUITION-2401",
      processedAt: formatISO(-40),
      notes: "Term 2 tuition deposit",
    },
    {
      id: "pay-dami-feb",
      studentId: "student-damilola",
      amount: 60000,
      method: "card",
      status: "completed",
      reference: "VEA-TUITION-2402",
      processedAt: formatISO(-10),
    },
  ];

  const paymentsAyomide: ParentPayment[] = [
    {
      id: "pay-ayo-jan",
      studentId: "student-ayomide",
      amount: 140000,
      method: "bank-transfer",
      status: "completed",
      reference: "VEA-TUITION-SS1-2401",
      processedAt: formatISO(-41),
    },
    {
      id: "pay-ayo-fundraiser",
      studentId: "student-ayomide",
      amount: 15000,
      method: "cash",
      status: "completed",
      reference: "VEA-CLUB-INV-8821",
      processedAt: formatISO(-15),
      notes: "STEM lab fundraising contribution",
    },
  ];

  const financials: ParentFinancialAccount[] = [
    {
      id: "fin-damilola",
      studentId: "student-damilola",
      planType: "termly",
      balance: 85000,
      scholarshipPercentage: 10,
      lastPaymentDate: paymentsDamilola[paymentsDamilola.length - 1]?.processedAt ?? now.toISOString(),
      upcomingDueDate: formatISO(12),
      payments: paymentsDamilola,
    },
    {
      id: "fin-ayomide",
      studentId: "student-ayomide",
      planType: "monthly",
      balance: 45000,
      scholarshipPercentage: 15,
      lastPaymentDate: paymentsAyomide[paymentsAyomide.length - 1]?.processedAt ?? now.toISOString(),
      upcomingDueDate: formatISO(6),
      payments: paymentsAyomide,
    },
  ];

  const notifications: ParentNotification[] = [
    {
      id: "notif-chem-lab",
      title: "Chemistry Lab Safety Meeting",
      message: "Please review and acknowledge the updated lab safety guidelines for Ayomide's physics project.",
      category: "academic",
      status: "new",
      createdAt: formatISO(-1, 8),
      actionUrl: "/parent/meetings",
    },
    {
      id: "notif-tuition-reminder",
      title: "Term 2 Tuition Reminder",
      message: "₦85,000 balance outstanding for Damilola. Kindly settle before the due date to avoid late fees.",
      category: "finance",
      status: "new",
      createdAt: formatISO(-2, 10),
      actionUrl: "/parent/payments",
    },
    {
      id: "notif-pta",
      title: "PTA General Assembly",
      message: "The PTA assembly holds this Saturday at the school auditorium by 10am.",
      category: "community",
      status: "read",
      createdAt: formatISO(-5, 9),
    },
  ];

  const meetings: ParentMeeting[] = [
    {
      id: "meet-progress-damilola",
      studentId: "student-damilola",
      staffName: "Mrs. Bisi Olatunji",
      staffRole: "English Language Teacher",
      scheduledFor: formatISO(4, 13, 30),
      agenda: "Review oral presentation progress and reading habits.",
      location: "virtual",
      status: "scheduled",
      createdAt: formatISO(-3),
    },
    {
      id: "meet-stem-mentoring",
      studentId: "student-ayomide",
      staffName: "Mr. Kola Balogun",
      staffRole: "Physics Teacher",
      scheduledFor: formatISO(9, 10),
      agenda: "Discuss STEM mentoring opportunities and competitions.",
      location: "in-person",
      status: "awaiting-confirmation",
      createdAt: formatISO(-1),
    },
  ];

  const supportThreads: ParentSupportThread[] = [
    {
      id: "support-bus-route",
      subject: "Clarification on new school bus route",
      studentId: "student-damilola",
      status: "open",
      createdAt: formatISO(-6),
      updatedAt: formatISO(-2),
      messages: [
        {
          id: "msg-bus-parent",
          author: "Parent",
          body: "Could you confirm if the pick-up time for the Lekki Phase 1 route has changed?",
          sentAt: formatISO(-6, 7, 30),
        },
        {
          id: "msg-bus-admin",
          author: "School",
          body: "Yes, the bus now departs 15 minutes earlier due to road construction. Updated schedule attached.",
          sentAt: formatISO(-5, 12, 15),
        },
      ],
    },
    {
      id: "support-club-dues",
      subject: "STEM Club dues receipt",
      studentId: "student-ayomide",
      status: "resolved",
      createdAt: formatISO(-12),
      updatedAt: formatISO(-8),
      messages: [
        {
          id: "msg-club-parent",
          author: "Parent",
          body: "Please confirm receipt of the ₦15,000 club dues paid last week.",
          sentAt: formatISO(-12, 8, 45),
        },
        {
          id: "msg-club-admin",
          author: "School",
          body: "Payment received and recorded. Receipt number VEA-CLUB-INV-8821.",
          sentAt: formatISO(-11, 9, 20),
        },
      ],
    },
  ];

  return {
    profile,
    students,
    attendance,
    financials,
    notifications,
    meetings,
    supportThreads,
  };
}

function getState(): ParentState {
  const globalObj = getGlobal();
  if (!globalObj[GLOBAL_KEY]) {
    globalObj[GLOBAL_KEY] = seedState();
  }
  return globalObj[GLOBAL_KEY]!;
}

export function getParentProfile(): ParentProfile {
  return clone(getState().profile);
}

export function listParentStudents(): ParentStudent[] {
  return clone(getState().students);
}

export function listParentAssignments(): Array<
  ParentAssignmentPreview & { studentId: string; studentName: string }
> {
  const state = getState();
  const assignments: Array<ParentAssignmentPreview & { studentId: string; studentName: string }> = [];
  state.students.forEach((student) => {
    student.upcomingAssignments.forEach((assignment) => {
      assignments.push({ ...assignment, studentId: student.id, studentName: student.name });
    });
  });
  return clone(
    assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  );
}

export function getParentStudent(studentId: string): ParentStudent | undefined {
  return clone(getState().students.find((student) => student.id === studentId));
}

export function listParentAttendance(studentId?: string): ParentAttendanceRecord[] {
  const records = getState().attendance.filter((record) => !studentId || record.studentId === studentId);
  return clone(records);
}

export function listParentFinancialAccounts(): ParentFinancialAccount[] {
  return clone(getState().financials);
}

export function listParentNotifications(): ParentNotification[] {
  return clone(
    getState().notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
}

export function listParentMeetings(): ParentMeeting[] {
  return clone(
    getState().meetings.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
  );
}

export function listParentSupportThreads(): ParentSupportThread[] {
  return clone(
    getState().supportThreads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );
}

export function getParentDashboardMetrics(): ParentDashboardMetrics {
  const state = getState();
  const assignmentsDue = state.students.reduce((total, student) => {
    return (
      total +
      student.upcomingAssignments.filter((assignment) => assignment.status !== "graded").length
    );
  }, 0);

  const upcomingMeetings = state.meetings.filter((meeting) => {
    const statusOk = meeting.status === "scheduled" || meeting.status === "awaiting-confirmation";
    if (!statusOk) return false;
    const meetingDate = new Date(meeting.scheduledFor);
    const now = new Date();
    const diff = meetingDate.getTime() - now.getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return diff >= 0 && diff <= sevenDays;
  }).length;

  const unreadNotifications = state.notifications.filter((notification) => notification.status === "new").length;
  const outstandingBalance = state.financials.reduce((sum, account) => sum + Math.max(account.balance, 0), 0);

  return {
    assignmentsDue,
    upcomingMeetings,
    unreadNotifications,
    outstandingBalance,
  };
}

export function recordParentPayment(input: {
  studentId: string;
  amount: number;
  method: PaymentMethod;
  notes?: string;
}): ParentPayment {
  const state = getState();
  const account = state.financials.find((fin) => fin.studentId === input.studentId);
  if (!account) {
    throw new Error("Student financial account not found");
  }

  if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error("Invalid payment amount");
  }

  const allowedMethods: PaymentMethod[] = ["bank-transfer", "card", "cash"];
  if (!allowedMethods.includes(input.method)) {
    throw new Error("Invalid payment method");
  }

  const payment: ParentPayment = {
    id: randomUUID(),
    studentId: input.studentId,
    amount: input.amount,
    method: input.method,
    status: "processing",
    reference: `VEA-${input.studentId}-${Date.now()}`.toUpperCase(),
    processedAt: new Date().toISOString(),
    notes: input.notes,
  };

  account.payments.push(payment);
  account.balance = Math.max(account.balance - input.amount, 0);
  account.lastPaymentDate = payment.processedAt;

  payment.status = "completed";

  return clone(payment);
}

export function updateParentNotification(
  notificationId: string,
  updates: Partial<Pick<ParentNotification, "status">>
): ParentNotification {
  const state = getState();
  const notification = state.notifications.find((item) => item.id === notificationId);
  if (!notification) {
    throw new Error("Notification not found");
  }
  if (updates.status) {
    notification.status = updates.status;
  }
  return clone(notification);
}

export function scheduleParentMeeting(input: {
  studentId: string;
  staffName: string;
  staffRole: string;
  scheduledFor: string;
  agenda: string;
  location: ParentMeeting["location"];
}): ParentMeeting {
  const meeting: ParentMeeting = {
    id: randomUUID(),
    studentId: input.studentId,
    staffName: input.staffName,
    staffRole: input.staffRole,
    scheduledFor: input.scheduledFor,
    agenda: input.agenda,
    location: input.location,
    status: "awaiting-confirmation",
    createdAt: new Date().toISOString(),
  };

  const state = getState();
  state.meetings.push(meeting);
  return clone(meeting);
}

export function updateParentMeeting(
  meetingId: string,
  updates: Partial<Pick<ParentMeeting, "scheduledFor" | "status" | "agenda" | "location" | "notes">>
): ParentMeeting {
  const state = getState();
  const meeting = state.meetings.find((item) => item.id === meetingId);
  if (!meeting) {
    throw new Error("Meeting not found");
  }
  Object.assign(meeting, updates);
  return clone(meeting);
}

export function appendParentSupportMessage(
  threadId: string,
  message: Pick<ParentSupportMessage, "body"> & { author?: ParentSupportMessage["author"] }
): ParentSupportThread {
  const state = getState();
  const thread = state.supportThreads.find((item) => item.id === threadId);
  if (!thread) {
    throw new Error("Support thread not found");
  }

  const supportMessage: ParentSupportMessage = {
    id: randomUUID(),
    author: message.author ?? "Parent",
    body: message.body,
    sentAt: new Date().toISOString(),
  };

  thread.messages.push(supportMessage);
  thread.updatedAt = supportMessage.sentAt;
  if (thread.status === "resolved") {
    thread.status = "open";
  }

  return clone(thread);
}

export function createParentSupportThread(input: {
  subject: string;
  body: string;
  studentId?: string;
}): ParentSupportThread {
  const thread: ParentSupportThread = {
    id: randomUUID(),
    subject: input.subject,
    studentId: input.studentId,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: randomUUID(),
        author: "Parent",
        body: input.body,
        sentAt: new Date().toISOString(),
      },
    ],
  };

  const state = getState();
  state.supportThreads.push(thread);
  return clone(thread);
}

export function setParentSupportStatus(threadId: string, status: SupportStatus): ParentSupportThread {
  const state = getState();
  const thread = state.supportThreads.find((item) => item.id === threadId);
  if (!thread) {
    throw new Error("Support thread not found");
  }
  thread.status = status;
  thread.updatedAt = new Date().toISOString();
  return clone(thread);
}

export function getParentScheduleOverview(): Array<{
  studentId: string;
  studentName: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  activity: string;
  location: string;
}> {
  const students = getState().students;
  const schedule: Array<{
    studentId: string;
    studentName: string;
    day: DayOfWeek;
    startTime: string;
    endTime: string;
    activity: string;
    location: string;
  }> = [];

  students.forEach((student) => {
    if (student.id === "student-damilola") {
      schedule.push(
        {
          studentId: student.id,
          studentName: student.name,
          day: "Monday",
          startTime: "08:00",
          endTime: "09:00",
          activity: "Mathematics Revision",
          location: "Room 202",
        },
        {
          studentId: student.id,
          studentName: student.name,
          day: "Wednesday",
          startTime: "11:00",
          endTime: "12:00",
          activity: "Literature Circle",
          location: "Library",
        }
      );
    } else if (student.id === "student-ayomide") {
      schedule.push(
        {
          studentId: student.id,
          studentName: student.name,
          day: "Tuesday",
          startTime: "10:00",
          endTime: "11:30",
          activity: "Physics Lab Practical",
          location: "Physics Lab",
        },
        {
          studentId: student.id,
          studentName: student.name,
          day: "Thursday",
          startTime: "14:00",
          endTime: "15:30",
          activity: "STEM Club Mentoring",
          location: "Innovation Hub",
        }
      );
    }
  });

  return clone(schedule);
}

export function updateParentAssignmentStatus(
  studentId: string,
  assignmentId: string,
  status: AssignmentStatus
): ParentAssignmentPreview {
  const state = getState();
  const student = state.students.find((item) => item.id === studentId);
  if (!student) {
    throw new Error("Student not found");
  }
  const assignment = student.upcomingAssignments.find((item) => item.id === assignmentId);
  if (!assignment) {
    throw new Error("Assignment not found");
  }
  assignment.status = status;
  assignment.lastUpdated = new Date().toISOString();
  return clone(assignment);
}

