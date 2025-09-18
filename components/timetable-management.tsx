"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
  BookOpen,
  CalendarDays,
  Clock,
  Edit3,
  MapPin,
  NotebookPen,
  Plus,
  Timer,
  Trash2,
  User,
} from "lucide-react"

import { cn } from "@/lib/utils"

const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const

type Weekday = (typeof WEEK_DAYS)[number]
type TimetableEntryType = "lesson" | "break" | "club" | "assessment"

type TimetableEntry = {
  id: string
  subject: string
  teacher: string
  room: string
  start: string
  end: string
  type: TimetableEntryType
  note?: string
}

type TimetableStructure = Record<string, Record<Weekday, TimetableEntry[]>>

type SubjectVisualStyle = {
  container: string
  badge: string
  dot: string
}

type PeriodFormState = {
  subject: string
  teacher: string
  room: string
  start: string
  end: string
  type: TimetableEntryType
  note: string
}

const BASE_PERIOD_FORM: PeriodFormState = {
  subject: "",
  teacher: "",
  room: "",
  start: "",
  end: "",
  type: "lesson",
  note: "",
}

const SUBJECT_STYLE_POOL: SubjectVisualStyle[] = [
  {
    container: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-100/70 text-emerald-900",
    badge: "border-emerald-200 bg-emerald-500/15 text-emerald-700",
    dot: "bg-emerald-500",
  },
  {
    container: "border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-100/70 text-sky-900",
    badge: "border-sky-200 bg-sky-500/15 text-sky-700",
    dot: "bg-sky-500",
  },
  {
    container: "border-amber-200 bg-gradient-to-r from-amber-50 via-white to-amber-100/70 text-amber-900",
    badge: "border-amber-200 bg-amber-500/15 text-amber-700",
    dot: "bg-amber-500",
  },
  {
    container: "border-violet-200 bg-gradient-to-r from-violet-50 via-white to-violet-100/70 text-violet-900",
    badge: "border-violet-200 bg-violet-500/15 text-violet-700",
    dot: "bg-violet-500",
  },
  {
    container: "border-rose-200 bg-gradient-to-r from-rose-50 via-white to-rose-100/70 text-rose-900",
    badge: "border-rose-200 bg-rose-500/15 text-rose-700",
    dot: "bg-rose-500",
  },
  {
    container: "border-teal-200 bg-gradient-to-r from-teal-50 via-white to-teal-100/70 text-teal-900",
    badge: "border-teal-200 bg-teal-500/15 text-teal-700",
    dot: "bg-teal-500",
  },
]

const BREAK_STYLE: SubjectVisualStyle = {
  container: "border-slate-200 bg-slate-50 text-slate-700",
  badge: "border-slate-200 bg-slate-200/80 text-slate-700",
  dot: "bg-slate-400",
}

const CLUB_STYLE: SubjectVisualStyle = {
  container: "border-purple-200 bg-gradient-to-r from-purple-50 via-white to-purple-100/70 text-purple-900",
  badge: "border-purple-200 bg-purple-500/15 text-purple-700",
  dot: "bg-purple-500",
}

const ASSESSMENT_STYLE: SubjectVisualStyle = {
  container: "border-orange-200 bg-gradient-to-r from-orange-50 via-white to-orange-100/70 text-orange-900",
  badge: "border-orange-200 bg-orange-500/15 text-orange-700",
  dot: "bg-orange-500",
}

const SUBJECT_STYLE_CACHE = new Map<string, SubjectVisualStyle>()

const TYPE_META: Record<TimetableEntryType, { label: string; badge: string }> = {
  lesson: {
    label: "Lesson",
    badge: "border-[#2d682d]/30 bg-[#2d682d]/10 text-[#2d682d]",
  },
  break: {
    label: "Break",
    badge: "border-slate-300 bg-slate-200/80 text-slate-700",
  },
  club: {
    label: "Co-curricular",
    badge: "border-purple-200 bg-purple-500/15 text-purple-700",
  },
  assessment: {
    label: "Assessment",
    badge: "border-amber-200 bg-amber-500/15 text-amber-700",
  },
}

const INITIAL_TIMETABLE: TimetableStructure = {
  "Grade 10A": {
    Monday: [
      {
        id: "g10a-mon-1",
        subject: "Mathematics",
        teacher: "Mr. John Adeyemi",
        room: "Room 201",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Revision on quadratic functions with collaborative problem solving.",
      },
      {
        id: "g10a-mon-2",
        subject: "English Language",
        teacher: "Mrs. Amina Bello",
        room: "Room 204",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Analysing argumentative essays and peer feedback circles.",
      },
      {
        id: "g10a-mon-3",
        subject: "Chemistry",
        teacher: "Dr. Charles Mba",
        room: "Science Lab 1",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Practical on acid–base titration setups.",
      },
      {
        id: "g10a-mon-4",
        subject: "Wellness Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
        note: "Hydration, snack and short mindfulness routine.",
      },
      {
        id: "g10a-mon-5",
        subject: "Physics",
        teacher: "Mr. James Okoro",
        room: "Physics Lab 2",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Introduction to linear momentum with lab demonstrations.",
      },
      {
        id: "g10a-mon-6",
        subject: "Geography",
        teacher: "Mrs. Lola Akin",
        room: "Room 205",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "River systems and erosion control case study.",
      },
      {
        id: "g10a-mon-7",
        subject: "STEM Club",
        teacher: "Engr. Victor Musa",
        room: "Innovation Hub",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Robotics sprint: calibrating line-following sensors.",
      },
    ],
    Tuesday: [
      {
        id: "g10a-tue-1",
        subject: "Further Mathematics",
        teacher: "Mr. John Adeyemi",
        room: "Room 201",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Vectors in two-dimensional spaces.",
      },
      {
        id: "g10a-tue-2",
        subject: "Biology",
        teacher: "Mrs. Adesuwa Etim",
        room: "Science Lab 2",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Respiratory system comparative analysis.",
      },
      {
        id: "g10a-tue-3",
        subject: "Computer Science",
        teacher: "Ms. Ifeoma Obi",
        room: "ICT Suite",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "JavaScript control structures mini project.",
      },
      {
        id: "g10a-tue-4",
        subject: "Wellness Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g10a-tue-5",
        subject: "Civic Education",
        teacher: "Mrs. Lola Akin",
        room: "Room 205",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Duties of citizens and current affairs briefing.",
      },
      {
        id: "g10a-tue-6",
        subject: "Yorùbá",
        teacher: "Mr. Kayode Afolabi",
        room: "Room 203",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Proverbs and oral literature workshop.",
      },
      {
        id: "g10a-tue-7",
        subject: "Sports Practice",
        teacher: "Coach Daniel Ogun",
        room: "Sports Field",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Track drills and stretching sequence.",
      },
    ],
    Wednesday: [
      {
        id: "g10a-wed-1",
        subject: "Mathematics",
        teacher: "Mr. John Adeyemi",
        room: "Room 201",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Applied problems on simultaneous equations.",
      },
      {
        id: "g10a-wed-2",
        subject: "English Language",
        teacher: "Mrs. Amina Bello",
        room: "Room 204",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Group reading – character motivation in prose.",
      },
      {
        id: "g10a-wed-3",
        subject: "Physics Practical",
        teacher: "Mr. James Okoro",
        room: "Physics Lab",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Measuring acceleration due to gravity experiment.",
      },
      {
        id: "g10a-wed-4",
        subject: "Wellness Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g10a-wed-5",
        subject: "Economics",
        teacher: "Mrs. Chidinma Ojo",
        room: "Room 206",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Demand and supply elasticity calculations.",
      },
      {
        id: "g10a-wed-6",
        subject: "Christian Religious Studies",
        teacher: "Rev. Peter Adegoke",
        room: "Room 202",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Beatitudes discussion and reflection journal.",
      },
      {
        id: "g10a-wed-7",
        subject: "Peer Mentoring",
        teacher: "Counsellor Bisi Ojo",
        room: "Guidance Room",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Study buddy check-ins and goal review.",
      },
    ],
    Thursday: [
      {
        id: "g10a-thu-1",
        subject: "English Literature",
        teacher: "Mrs. Amina Bello",
        room: "Room 204",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Poetry analysis – imagery and symbolism.",
      },
      {
        id: "g10a-thu-2",
        subject: "History",
        teacher: "Mr. Daniel Alade",
        room: "Room 208",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "West African kingdoms – group presentations.",
      },
      {
        id: "g10a-thu-3",
        subject: "Agricultural Science",
        teacher: "Mrs. Grace Eze",
        room: "Agric Lab",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Soil texture testing practical.",
      },
      {
        id: "g10a-thu-4",
        subject: "Wellness Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g10a-thu-5",
        subject: "French",
        teacher: "Ms. Elise Dupont",
        room: "Language Lab",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Role play – ordering meals in French.",
      },
      {
        id: "g10a-thu-6",
        subject: "Visual Arts",
        teacher: "Mrs. Ifunanya Okeke",
        room: "Art Studio",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Perspective drawing workshop.",
      },
      {
        id: "g10a-thu-7",
        subject: "Debate Prep",
        teacher: "Mrs. Amina Bello",
        room: "Lecture Room",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Rebuttal drills for upcoming regional contest.",
      },
    ],
    Friday: [
      {
        id: "g10a-fri-1",
        subject: "Mathematics",
        teacher: "Mr. John Adeyemi",
        room: "Room 201",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Weekly diagnostic quiz and reflection.",
      },
      {
        id: "g10a-fri-2",
        subject: "Chemistry",
        teacher: "Dr. Charles Mba",
        room: "Science Lab 1",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Organic chemistry – homologous series overview.",
      },
      {
        id: "g10a-fri-3",
        subject: "Technical Drawing",
        teacher: "Mr. Samuel Osho",
        room: "Design Studio",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Isometric drawing exercises.",
      },
      {
        id: "g10a-fri-4",
        subject: "Wellness Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g10a-fri-5",
        subject: "Physics",
        teacher: "Mr. James Okoro",
        room: "Physics Lab 2",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Momentum conservation experiments.",
      },
      {
        id: "g10a-fri-6",
        subject: "Guidance & Counselling",
        teacher: "Counsellor Bisi Ojo",
        room: "Guidance Room",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Study habits and goal review clinic.",
      },
      {
        id: "g10a-fri-7",
        subject: "Leadership Seminar",
        teacher: "Principal Grace Umeh",
        room: "Auditorium",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Guest mentor session with alumni speaker.",
      },
    ],
  },
  "Grade 11B": {
    Monday: [
      {
        id: "g11b-mon-1",
        subject: "Economics",
        teacher: "Mrs. Chidinma Ojo",
        room: "Room 305",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "National income measurement – GDP vs. GNP.",
      },
      {
        id: "g11b-mon-2",
        subject: "Accounting",
        teacher: "Mr. Ibrahim Salihu",
        room: "Room 304",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Partnership accounts adjustments.",
      },
      {
        id: "g11b-mon-3",
        subject: "Government",
        teacher: "Mrs. Hauwa Umar",
        room: "Room 303",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Arms of government – separation of powers debate.",
      },
      {
        id: "g11b-mon-4",
        subject: "Community Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g11b-mon-5",
        subject: "Mathematics",
        teacher: "Mr. Daniel Olatunji",
        room: "Room 301",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Logarithms and indices drill set.",
      },
      {
        id: "g11b-mon-6",
        subject: "Entrepreneurship",
        teacher: "Mrs. Favour Nneji",
        room: "Innovation Hub",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Design thinking sprint for mini ventures.",
      },
      {
        id: "g11b-mon-7",
        subject: "Young Entrepreneurs Lab",
        teacher: "Mrs. Favour Nneji",
        room: "Innovation Hub",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Pitch deck reviews with mentors.",
      },
    ],
    Tuesday: [
      {
        id: "g11b-tue-1",
        subject: "Commerce",
        teacher: "Mrs. Lydia Effiong",
        room: "Room 302",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "International trade terms and INCOTERMS.",
      },
      {
        id: "g11b-tue-2",
        subject: "English Language",
        teacher: "Mrs. Amina Bello",
        room: "Room 304",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Formal letter writing – persuasive tone.",
      },
      {
        id: "g11b-tue-3",
        subject: "Geography",
        teacher: "Mr. Tunde Aluko",
        room: "Room 207",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Urbanisation patterns in Nigeria.",
      },
      {
        id: "g11b-tue-4",
        subject: "Community Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g11b-tue-5",
        subject: "Data Processing",
        teacher: "Ms. Ifeoma Obi",
        room: "ICT Suite",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Spreadsheet dashboards with charts.",
      },
      {
        id: "g11b-tue-6",
        subject: "Christian Religious Studies",
        teacher: "Rev. Peter Adegoke",
        room: "Room 202",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Faith and ethics in civic responsibility.",
      },
      {
        id: "g11b-tue-7",
        subject: "Sports Conditioning",
        teacher: "Coach Daniel Ogun",
        room: "Gymnasium",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Core strength and agility drills.",
      },
    ],
    Wednesday: [
      {
        id: "g11b-wed-1",
        subject: "Economics",
        teacher: "Mrs. Chidinma Ojo",
        room: "Room 305",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Fiscal policy instruments case studies.",
      },
      {
        id: "g11b-wed-2",
        subject: "Accounting",
        teacher: "Mr. Ibrahim Salihu",
        room: "Room 304",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Manufacturing account preparation.",
      },
      {
        id: "g11b-wed-3",
        subject: "Mathematics",
        teacher: "Mr. Daniel Olatunji",
        room: "Room 301",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Sequences and series problem solving.",
      },
      {
        id: "g11b-wed-4",
        subject: "Community Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g11b-wed-5",
        subject: "Literature-in-English",
        teacher: "Mrs. Amina Bello",
        room: "Room 304",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Drama – staging and characterisation exercises.",
      },
      {
        id: "g11b-wed-6",
        subject: "Leadership Development",
        teacher: "Principal Grace Umeh",
        room: "Principal's Suite",
        start: "11:20",
        end: "12:05",
        type: "club",
        note: "Project management clinic for prefects.",
      },
      {
        id: "g11b-wed-7",
        subject: "Community Service Planning",
        teacher: "Mrs. Hauwa Umar",
        room: "Community Hall",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Logistics meeting for outreach programme.",
      },
    ],
    Thursday: [
      {
        id: "g11b-thu-1",
        subject: "Business Studies",
        teacher: "Mrs. Lydia Effiong",
        room: "Room 302",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Stock exchange operations briefing.",
      },
      {
        id: "g11b-thu-2",
        subject: "Civic Education",
        teacher: "Mrs. Lola Akin",
        room: "Room 205",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Role of civil society groups.",
      },
      {
        id: "g11b-thu-3",
        subject: "Marketing",
        teacher: "Mr. Ibrahim Salihu",
        room: "Room 303",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Customer journey mapping workshop.",
      },
      {
        id: "g11b-thu-4",
        subject: "Community Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g11b-thu-5",
        subject: "Computer Science",
        teacher: "Ms. Ifeoma Obi",
        room: "ICT Suite",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Database concepts – ER diagrams.",
      },
      {
        id: "g11b-thu-6",
        subject: "French",
        teacher: "Ms. Elise Dupont",
        room: "Language Lab",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Listening comprehension – interviews.",
      },
      {
        id: "g11b-thu-7",
        subject: "Debate Club",
        teacher: "Mrs. Amina Bello",
        room: "Lecture Room",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Research clinic for national qualifiers.",
      },
    ],
    Friday: [
      {
        id: "g11b-fri-1",
        subject: "Economics Revision",
        teacher: "Mrs. Chidinma Ojo",
        room: "Room 305",
        start: "08:00",
        end: "08:45",
        type: "assessment",
        note: "Timed essay on inflation control policies.",
      },
      {
        id: "g11b-fri-2",
        subject: "Accounting",
        teacher: "Mr. Ibrahim Salihu",
        room: "Room 304",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Departmental account adjustments.",
      },
      {
        id: "g11b-fri-3",
        subject: "Government",
        teacher: "Mrs. Hauwa Umar",
        room: "Room 303",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Public policy formulation role-play.",
      },
      {
        id: "g11b-fri-4",
        subject: "Community Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g11b-fri-5",
        subject: "General Paper",
        teacher: "Mr. Daniel Olatunji",
        room: "Room 301",
        start: "10:35",
        end: "11:20",
        type: "assessment",
        note: "Critical thinking drills with past questions.",
      },
      {
        id: "g11b-fri-6",
        subject: "Entrepreneurship Clinic",
        teacher: "Mrs. Favour Nneji",
        room: "Innovation Hub",
        start: "11:20",
        end: "12:05",
        type: "club",
        note: "Prototype showcase and feedback loop.",
      },
      {
        id: "g11b-fri-7",
        subject: "Guided Study",
        teacher: "Mrs. Hauwa Umar",
        room: "Room 301",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Focused catch-up session for pending assignments.",
      },
    ],
  },
  "Grade 12A": {
    Monday: [
      {
        id: "g12a-mon-1",
        subject: "Mathematics",
        teacher: "Dr. Kemi Ajayi",
        room: "Room 401",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Integral calculus problem clinic.",
      },
      {
        id: "g12a-mon-2",
        subject: "Physics",
        teacher: "Mr. James Okoro",
        room: "Physics Lab 2",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Electromagnetic induction derivations.",
      },
      {
        id: "g12a-mon-3",
        subject: "Chemistry",
        teacher: "Dr. Charles Mba",
        room: "Science Lab 1",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Aromatics and electrophilic substitution workshop.",
      },
      {
        id: "g12a-mon-4",
        subject: "Respite Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g12a-mon-5",
        subject: "Biology",
        teacher: "Mrs. Adesuwa Etim",
        room: "Science Lab 2",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Genetics – Mendelian crosses and pedigree analysis.",
      },
      {
        id: "g12a-mon-6",
        subject: "English Language",
        teacher: "Mrs. Amina Bello",
        room: "Room 404",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Summary writing timed drill.",
      },
      {
        id: "g12a-mon-7",
        subject: "JAMB Clinic",
        teacher: "Dr. Kemi Ajayi",
        room: "Room 404",
        start: "12:05",
        end: "12:50",
        type: "assessment",
        note: "Mock test review and strategy coaching.",
      },
    ],
    Tuesday: [
      {
        id: "g12a-tue-1",
        subject: "Further Mathematics",
        teacher: "Dr. Kemi Ajayi",
        room: "Room 401",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Differential equations with boundary conditions.",
      },
      {
        id: "g12a-tue-2",
        subject: "Physics Practical",
        teacher: "Mr. James Okoro",
        room: "Physics Lab",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Measuring magnetic flux density hands-on.",
      },
      {
        id: "g12a-tue-3",
        subject: "Chemistry Practical",
        teacher: "Dr. Charles Mba",
        room: "Science Lab 1",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Qualitative analysis of salts.",
      },
      {
        id: "g12a-tue-4",
        subject: "Respite Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g12a-tue-5",
        subject: "Geography",
        teacher: "Mrs. Lola Akin",
        room: "Room 405",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Map interpretation and field sketching.",
      },
      {
        id: "g12a-tue-6",
        subject: "Economics",
        teacher: "Mrs. Chidinma Ojo",
        room: "Room 405",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Exchange rate systems comparative study.",
      },
      {
        id: "g12a-tue-7",
        subject: "Career Coaching",
        teacher: "Counsellor Bisi Ojo",
        room: "Guidance Room",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "University application checklist and essays.",
      },
    ],
    Wednesday: [
      {
        id: "g12a-wed-1",
        subject: "English Literature",
        teacher: "Mrs. Amina Bello",
        room: "Room 404",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Critical appreciation of unseen poetry.",
      },
      {
        id: "g12a-wed-2",
        subject: "Biology",
        teacher: "Mrs. Adesuwa Etim",
        room: "Science Lab 2",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Human reproduction – ethical considerations.",
      },
      {
        id: "g12a-wed-3",
        subject: "Mathematics Revision",
        teacher: "Dr. Kemi Ajayi",
        room: "Room 401",
        start: "09:30",
        end: "10:15",
        type: "assessment",
        note: "Timed objective drills and correction clinic.",
      },
      {
        id: "g12a-wed-4",
        subject: "Respite Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g12a-wed-5",
        subject: "ICT",
        teacher: "Ms. Ifeoma Obi",
        room: "ICT Suite",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Spreadsheet modelling for scientific data.",
      },
      {
        id: "g12a-wed-6",
        subject: "Civic Education",
        teacher: "Mrs. Lola Akin",
        room: "Room 405",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Constitutional rights – revision clinic.",
      },
      {
        id: "g12a-wed-7",
        subject: "Scholarship Prep",
        teacher: "Counsellor Bisi Ojo",
        room: "Guidance Room",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Interview simulations with alumni panel.",
      },
    ],
    Thursday: [
      {
        id: "g12a-thu-1",
        subject: "Chemistry",
        teacher: "Dr. Charles Mba",
        room: "Science Lab 1",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Thermodynamics – enthalpy changes.",
      },
      {
        id: "g12a-thu-2",
        subject: "Physics",
        teacher: "Mr. James Okoro",
        room: "Physics Lab 2",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Quantum energy levels recap.",
      },
      {
        id: "g12a-thu-3",
        subject: "Biology Practical",
        teacher: "Mrs. Adesuwa Etim",
        room: "Science Lab 2",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Microscopy – staining techniques.",
      },
      {
        id: "g12a-thu-4",
        subject: "Respite Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g12a-thu-5",
        subject: "Further Mathematics",
        teacher: "Dr. Kemi Ajayi",
        room: "Room 401",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Complex numbers – De Moivre's theorem.",
      },
      {
        id: "g12a-thu-6",
        subject: "General Paper",
        teacher: "Mrs. Amina Bello",
        room: "Room 404",
        start: "11:20",
        end: "12:05",
        type: "assessment",
        note: "Essay outline clinic and peer review.",
      },
      {
        id: "g12a-thu-7",
        subject: "Entrepreneurship Seminar",
        teacher: "Mrs. Favour Nneji",
        room: "Innovation Hub",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Startup financial modelling masterclass.",
      },
    ],
    Friday: [
      {
        id: "g12a-fri-1",
        subject: "Mathematics",
        teacher: "Dr. Kemi Ajayi",
        room: "Room 401",
        start: "08:00",
        end: "08:45",
        type: "lesson",
        note: "Differentiation past question marathon.",
      },
      {
        id: "g12a-fri-2",
        subject: "English Language",
        teacher: "Mrs. Amina Bello",
        room: "Room 404",
        start: "08:45",
        end: "09:30",
        type: "lesson",
        note: "Listening comprehension – note taking accuracy.",
      },
      {
        id: "g12a-fri-3",
        subject: "Physics",
        teacher: "Mr. James Okoro",
        room: "Physics Lab 2",
        start: "09:30",
        end: "10:15",
        type: "lesson",
        note: "Past question clinic – radioactivity.",
      },
      {
        id: "g12a-fri-4",
        subject: "Respite Break",
        teacher: "Student Welfare Team",
        room: "Courtyard",
        start: "10:15",
        end: "10:35",
        type: "break",
      },
      {
        id: "g12a-fri-5",
        subject: "Chemistry",
        teacher: "Dr. Charles Mba",
        room: "Science Lab 1",
        start: "10:35",
        end: "11:20",
        type: "lesson",
        note: "Electrolysis practice questions.",
      },
      {
        id: "g12a-fri-6",
        subject: "Biology",
        teacher: "Mrs. Adesuwa Etim",
        room: "Science Lab 2",
        start: "11:20",
        end: "12:05",
        type: "lesson",
        note: "Homeostasis revision checkpoints.",
      },
      {
        id: "g12a-fri-7",
        subject: "Wellness Hour",
        teacher: "Coach Daniel Ogun",
        room: "Sports Field",
        start: "12:05",
        end: "12:50",
        type: "club",
        note: "Yoga stretch and breathing exercises.",
      },
    ],
  },
}

export default function TimetableManagement() {
  const [timetable, setTimetable] = React.useState<TimetableStructure>(INITIAL_TIMETABLE)
  const classOptions = React.useMemo(() => Object.keys(timetable).sort((a, b) => a.localeCompare(b)), [timetable])
  const [selectedClass, setSelectedClass] = React.useState(() => classOptions[0] ?? "")
  const dayOptions = React.useMemo(() => {
    if (!selectedClass) return [] as Weekday[]
    const classDays = timetable[selectedClass]
    if (!classDays) return [] as Weekday[]
    return WEEK_DAYS.filter((day) => Object.prototype.hasOwnProperty.call(classDays, day))
  }, [selectedClass, timetable])
  const [selectedDay, setSelectedDay] = React.useState<Weekday>(() => dayOptions[0] ?? WEEK_DAYS[0])
  const [viewMode, setViewMode] = React.useState<"day" | "week">("day")

  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogMode, setDialogMode] = React.useState<"create" | "edit">("create")
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [formState, setFormState] = React.useState<PeriodFormState>({ ...BASE_PERIOD_FORM })
  const [formError, setFormError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (classOptions.length === 0) {
      setSelectedClass("")
      return
    }
    if (!selectedClass || !classOptions.includes(selectedClass)) {
      setSelectedClass(classOptions[0])
    }
  }, [classOptions, selectedClass])

  React.useEffect(() => {
    if (dayOptions.length === 0) {
      setSelectedDay(dayOptions[0] ?? WEEK_DAYS[0])
      return
    }
    if (!dayOptions.includes(selectedDay)) {
      setSelectedDay(dayOptions[0])
    }
  }, [dayOptions, selectedDay])

  const dayEntries = React.useMemo(() => {
    if (!selectedClass || !selectedDay) return [] as TimetableEntry[]
    const entries = timetable[selectedClass]?.[selectedDay] ?? []
    return [...entries].sort((a, b) => a.start.localeCompare(b.start))
  }, [selectedClass, selectedDay, timetable])

  const weeklyLookup = React.useMemo(() => {
    const lookup = new Map<Weekday, Map<string, TimetableEntry>>()
    if (!selectedClass) return lookup
    const classDays = timetable[selectedClass] ?? {}
    for (const day of WEEK_DAYS) {
      const dayEntriesForDay = classDays[day]
      if (!dayEntriesForDay) continue
      const slotMap = new Map<string, TimetableEntry>()
      for (const entry of dayEntriesForDay) {
        slotMap.set(`${entry.start}-${entry.end}`, entry)
      }
      lookup.set(day, slotMap)
    }
    return lookup
  }, [selectedClass, timetable])

  const weeklyTimeSlots = React.useMemo(() => {
    const slots = new Map<string, { start: string; end: string }>()
    const classDays = timetable[selectedClass] ?? {}
    for (const day of WEEK_DAYS) {
      const dayEntriesForDay = classDays[day]
      if (!dayEntriesForDay) continue
      for (const entry of dayEntriesForDay) {
        const key = `${entry.start}-${entry.end}`
        if (!slots.has(key)) {
          slots.set(key, { start: entry.start, end: entry.end })
        }
      }
    }
    return Array.from(slots.values()).sort((a, b) => a.start.localeCompare(b.start))
  }, [selectedClass, timetable])

  const subjectOptions = React.useMemo(() => {
    const subjects = new Set<string>()
    for (const classDays of Object.values(timetable)) {
      for (const entries of Object.values(classDays)) {
        for (const entry of entries) {
          if (entry.subject) subjects.add(entry.subject)
        }
      }
    }
    return Array.from(subjects).sort((a, b) => a.localeCompare(b))
  }, [timetable])

  const teacherOptions = React.useMemo(() => {
    const teachers = new Set<string>()
    for (const classDays of Object.values(timetable)) {
      for (const entries of Object.values(classDays)) {
        for (const entry of entries) {
          if (entry.teacher) teachers.add(entry.teacher)
        }
      }
    }
    return Array.from(teachers).sort((a, b) => a.localeCompare(b))
  }, [timetable])

  const roomOptions = React.useMemo(() => {
    const rooms = new Set<string>()
    for (const classDays of Object.values(timetable)) {
      for (const entries of Object.values(classDays)) {
        for (const entry of entries) {
          if (entry.room) rooms.add(entry.room)
        }
      }
    }
    return Array.from(rooms).sort((a, b) => a.localeCompare(b))
  }, [timetable])

  const dayInsights = React.useMemo(() => {
    if (dayEntries.length === 0) {
      return {
        lessonCount: 0,
        breakCount: 0,
        totalMinutes: 0,
        firstStart: null as string | null,
        lastEnd: null as string | null,
      }
    }
    const sorted = [...dayEntries].sort((a, b) => a.start.localeCompare(b.start))
    const lessons = sorted.filter((entry) => entry.type !== "break")
    const breaks = sorted.filter((entry) => entry.type === "break")
    const totalMinutes = lessons.reduce((acc, entry) => acc + differenceInMinutes(entry.start, entry.end), 0)
    return {
      lessonCount: lessons.length,
      breakCount: breaks.length,
      totalMinutes,
      firstStart: sorted[0]?.start ?? null,
      lastEnd: sorted[sorted.length - 1]?.end ?? null,
    }
  }, [dayEntries])

  const closeDialog = React.useCallback(() => {
    setDialogOpen(false)
    setDialogMode("create")
    setEditingIndex(null)
    setFormState({ ...BASE_PERIOD_FORM })
    setFormError(null)
  }, [])
  const handleDialogOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        closeDialog()
      } else {
        setDialogOpen(true)
      }
    },
    [closeDialog],
  )

  const openCreateDialog = React.useCallback(() => {
    if (!selectedClass || !selectedDay) return
    const lastEntry = dayEntries[dayEntries.length - 1]
    const defaultStart = lastEntry ? lastEntry.end : "08:00"
    const defaultEnd = addMinutes(defaultStart, 45)
    setDialogMode("create")
    setEditingIndex(null)
    setFormState({
      ...BASE_PERIOD_FORM,
      start: defaultStart,
      end: defaultEnd,
    })
    setFormError(null)
    setDialogOpen(true)
  }, [dayEntries, selectedClass, selectedDay])

  const openEditDialog = React.useCallback(
    (index: number) => {
      const entry = dayEntries[index]
      if (!entry) return
      setDialogMode("edit")
      setEditingIndex(index)
      setFormState({
        subject: entry.subject,
        teacher: entry.teacher,
        room: entry.room,
        start: entry.start,
        end: entry.end,
        type: entry.type,
        note: entry.note ?? "",
      })
      setFormError(null)
      setDialogOpen(true)
    },
    [dayEntries],
  )

  const handleDeleteEntry = React.useCallback(
    (index: number) => {
      if (!selectedClass || !selectedDay) return
      setTimetable((prev) => {
        const classDays = prev[selectedClass]
        if (!classDays) return prev
        const entries = classDays[selectedDay]
        if (!entries) return prev
        const updatedEntries = entries.filter((_, idx) => idx !== index)
        return {
          ...prev,
          [selectedClass]: {
            ...classDays,
            [selectedDay]: updatedEntries,
          },
        }
      })
      if (dialogMode === "edit" && editingIndex === index) {
        closeDialog()
      }
    },
    [closeDialog, dialogMode, editingIndex, selectedClass, selectedDay],
  )

  const handleFormSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!selectedClass || !selectedDay) return
      const trimmedSubject = formState.subject.trim()
      const trimmedTeacher = formState.teacher.trim()
      const trimmedRoom = formState.room.trim()
      const start = formState.start
      const end = formState.end
      if (!trimmedSubject) {
        setFormError("Please enter a subject or activity name.")
        return
      }
      if (!start || !end) {
        setFormError("Please provide both start and end times.")
        return
      }
      const startMinutes = parseTime(start)
      const endMinutes = parseTime(end)
      if (startMinutes === null || endMinutes === null) {
        setFormError("Times must be in a valid HH:MM format.")
        return
      }
      if (endMinutes <= startMinutes) {
        setFormError("The end time must be later than the start time.")
        return
      }

      setTimetable((prev) => {
        const classDays = prev[selectedClass] ?? ({} as Record<Weekday, TimetableEntry[]>)
        const entries = classDays[selectedDay] ?? []
        const newEntry: TimetableEntry = {
          id:
            dialogMode === "edit" && editingIndex !== null && entries[editingIndex]
              ? entries[editingIndex].id
              : `tt-${Date.now()}`,
          subject: trimmedSubject,
          teacher: trimmedTeacher || "To be assigned",
          room: trimmedRoom || "TBC",
          start,
          end,
          type: formState.type,
          note: formState.note.trim() || undefined,
        }

        const updatedEntries = dialogMode === "edit" && editingIndex !== null
          ? entries.map((entry, idx) => (idx === editingIndex ? newEntry : entry))
          : [...entries, newEntry]

        updatedEntries.sort((a, b) => a.start.localeCompare(b.start))

        return {
          ...prev,
          [selectedClass]: {
            ...classDays,
            [selectedDay]: updatedEntries,
          },
        }
      })

      closeDialog()
    },
    [closeDialog, dialogMode, editingIndex, formState, selectedClass, selectedDay],
  )

  const durationLabel = React.useMemo(() => {
    if (dayInsights.totalMinutes === 0) return "0 min"
    const hours = Math.floor(dayInsights.totalMinutes / 60)
    const minutes = dayInsights.totalMinutes % 60
    if (hours === 0) return `${minutes} min`
    if (minutes === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
    return `${hours}h ${minutes}m`
  }, [dayInsights.totalMinutes])
  return (
    <div className="space-y-6">
      <Card className="border-[#2d682d]/20">
        <CardHeader>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl font-bold text-[#2d682d]">Timetable Management</CardTitle>
              <CardDescription>
                Coordinate class schedules, assessments and co-curricular moments from a single, friendly workspace.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-[#2d682d]/80">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="min-w-[180px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-[#2d682d]/80">Day</Label>
                <Select value={selectedDay} onValueChange={(value) => setSelectedDay(value as Weekday)}>
                  <SelectTrigger className="min-w-[160px]">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "day" | "week")}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <TabsList className="bg-[#2d682d]/10">
                <TabsTrigger
                  value="day"
                  className="data-[state=active]:bg-[#2d682d] data-[state=active]:text-white"
                >
                  Day view
                </TabsTrigger>
                <TabsTrigger
                  value="week"
                  className="data-[state=active]:bg-[#2d682d] data-[state=active]:text-white"
                >
                  Week grid
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="rounded-full border-[#2d682d]/30 bg-[#2d682d]/10 px-3 py-1 text-xs font-semibold text-[#2d682d]"
                >
                  {selectedClass}
                </Badge>
                <Button onClick={openCreateDialog} className="bg-[#b29032] hover:bg-[#9a7c2a] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  New period
                </Button>
              </div>
            </div>
            <TabsContent value="day" className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-[#2d682d]/20 bg-[#2d682d]/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2d682d]/80">Lesson blocks</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d682d]">{dayInsights.lessonCount}</p>
                  <p className="text-xs text-[#2d682d]/70">{selectedDay} learning sessions</p>
                </div>
                <div className="rounded-2xl border border-[#b29032]/20 bg-[#b29032]/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#b29032]/80">Breaks & clubs</p>
                  <p className="mt-2 text-2xl font-semibold text-[#b29032]">{dayInsights.breakCount}</p>
                  <p className="text-xs text-[#b29032]/70">Wellness and enrichment slots</p>
                </div>
                <div className="rounded-2xl border border-[#2d682d]/15 bg-white p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#2d682d]/70">Instructional time</p>
                  <p className="mt-2 text-2xl font-semibold text-[#2d682d]">{durationLabel}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 text-[#2d682d]" />
                    <span>
                      {dayInsights.firstStart && dayInsights.lastEnd
                        ? `${formatTimeRange(dayInsights.firstStart, dayInsights.lastEnd)}`
                        : "No periods scheduled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-[#2d682d]" />
                <span>
                  Viewing <span className="font-medium text-[#2d682d]">{selectedDay}</span> timetable overview.
                </span>
              </div>

              {dayEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#2d682d]/30 bg-[#2d682d]/5 p-8 text-center text-sm text-[#2d682d]">
                  No periods scheduled for {selectedDay}. Use “New period” to add the first block.
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-[#2d682d]/20" aria-hidden />
                  <div className="space-y-4 pl-8">
                    {dayEntries.map((entry, index) => {
                      const style = getEntryStyle(entry)
                      return (
                        <div
                          key={entry.id}
                          className={cn(
                            "relative rounded-2xl border p-5 shadow-sm transition-all hover:translate-y-0.5 hover:shadow-lg",
                            style.container,
                          )}
                        >
                          <span
                            className={cn(
                              "absolute -left-5 top-6 h-3 w-3 rounded-full border-2 border-white shadow",
                              style.dot,
                            )}
                          />
                          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div className="space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                                    style.badge,
                                  )}
                                >
                                  <BookOpen className="h-3.5 w-3.5" />
                                  {entry.subject}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                    TYPE_META[entry.type].badge,
                                  )}
                                >
                                  {TYPE_META[entry.type].label}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-dashed border-[#2d682d]/30 bg-white/70 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[#2d682d]"
                                >
                                  <Clock className="mr-1 h-3 w-3" />
                                  {formatTimeRange(entry.start, entry.end)}
                                </Badge>
                              </div>
                              {entry.note ? (
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                  <NotebookPen className="mr-2 inline h-4 w-4 text-[#b29032]" />
                                  {entry.note}
                                </p>
                              ) : null}
                              <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-[#2d682d]" />
                                  <span>{entry.teacher}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-[#2d682d]" />
                                  <span>{entry.room}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Timer className="h-4 w-4 text-[#2d682d]" />
                                  <span>{formatDuration(entry.start, entry.end)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-end gap-1 self-start">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-[#2d682d]"
                                onClick={() => openEditDialog(index)}
                                aria-label="Edit period"
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-red-600"
                                    aria-label="Remove period"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remove this period?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action will remove {entry.subject} from the {selectedDay} timetable for {selectedClass}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => handleDeleteEntry(index)}
                                    >
                                      Remove period
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="week" className="space-y-4">
              <Card className="border-[#2d682d]/15 bg-[#2d682d]/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-[#2d682d]">Weekly grid overview</CardTitle>
                  <CardDescription>
                    Compare blocks across the week to spot overlaps, free windows and assessment loads.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ScrollArea className="max-h-[520px]">
                    <div className="min-w-[720px] space-y-3">
                      <table className="w-full border-separate border-spacing-y-3">
                        <thead>
                          <tr>
                            <th className="w-40 text-left text-xs font-semibold uppercase tracking-wide text-[#2d682d]/70">
                              Time block
                            </th>
                            {dayOptions.map((day) => (
                              <th
                                key={day}
                                className="text-left text-xs font-semibold uppercase tracking-wide text-[#2d682d]/70"
                              >
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {weeklyTimeSlots.map((slot) => (
                            <tr key={`${slot.start}-${slot.end}`} className="align-top">
                              <td className="pr-3 align-top">
                                <div className="rounded-2xl border border-dashed border-[#2d682d]/30 bg-white/70 px-3 py-2 text-xs font-semibold text-[#2d682d]">
                                  {formatTimeRange(slot.start, slot.end)}
                                </div>
                              </td>
                              {dayOptions.map((day) => {
                                const entry = weeklyLookup.get(day)?.get(`${slot.start}-${slot.end}`)
                                if (!entry) {
                                  return (
                                    <td key={`${day}-${slot.start}`} className="align-top">
                                      <div className="flex min-h-[96px] items-center justify-center rounded-2xl border border-dashed border-[#2d682d]/20 bg-white/70 text-xs text-muted-foreground">
                                        Free window
                                      </div>
                                    </td>
                                  )
                                }
                                const style = getEntryStyle(entry)
                                return (
                                  <td key={`${day}-${entry.id}`} className="align-top">
                                    <div
                                      className={cn(
                                        "flex min-h-[96px] flex-col gap-2 rounded-2xl border p-3 text-sm shadow-sm",
                                        style.container,
                                      )}
                                    >
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "rounded-full px-2.5 py-1 text-xs font-semibold",
                                            style.badge,
                                          )}
                                        >
                                          {entry.subject}
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                                            TYPE_META[entry.type].badge,
                                          )}
                                        >
                                          {TYPE_META[entry.type].label}
                                        </Badge>
                                      </div>
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        <p className="font-medium text-foreground">{entry.teacher}</p>
                                        <p>{entry.room}</p>
                                        {entry.note ? <p className="leading-relaxed">{entry.note}</p> : null}
                                      </div>
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold uppercase tracking-wide text-[#2d682d]">Block types:</span>
            {Object.entries(TYPE_META).map(([key, meta]) => (
              <Badge
                key={key}
                variant="outline"
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide",
                  meta.badge,
                )}
              >
                {meta.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Update period" : "Create new period"}</DialogTitle>
            <DialogDescription>
              Plan a {selectedDay} block for {selectedClass}. Times default to 45-minute windows; adjust as needed.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="period-subject">Subject or activity</Label>
                <Input
                  id="period-subject"
                  value={formState.subject}
                  onChange={(event) => setFormState((prev) => ({ ...prev, subject: event.target.value }))}
                  placeholder="e.g. Mathematics"
                  required
                />
                {subjectOptions.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Popular: {subjectOptions.slice(0, 4).join(", ")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-type">Block type</Label>
                <Select
                  value={formState.type}
                  onValueChange={(value) => setFormState((prev) => ({ ...prev, type: value as TimetableEntryType }))}
                >
                  <SelectTrigger id="period-type">
                    <SelectValue placeholder="Select block type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lesson">Lesson</SelectItem>
                    <SelectItem value="assessment">Assessment</SelectItem>
                    <SelectItem value="club">Co-curricular</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-teacher">Teacher / facilitator</Label>
                <Input
                  id="period-teacher"
                  value={formState.teacher}
                  onChange={(event) => setFormState((prev) => ({ ...prev, teacher: event.target.value }))}
                  placeholder="Who leads this block?"
                  list="teacher-suggestions"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-room">Room / venue</Label>
                <Input
                  id="period-room"
                  value={formState.room}
                  onChange={(event) => setFormState((prev) => ({ ...prev, room: event.target.value }))}
                  placeholder="Where does it hold?"
                  list="room-suggestions"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="period-start">Starts</Label>
                <Input
                  id="period-start"
                  type="time"
                  value={formState.start}
                  onChange={(event) => setFormState((prev) => ({ ...prev, start: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period-end">Ends</Label>
                <Input
                  id="period-end"
                  type="time"
                  value={formState.end}
                  onChange={(event) => setFormState((prev) => ({ ...prev, end: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-note">Focus / notes</Label>
              <Textarea
                id="period-note"
                value={formState.note}
                onChange={(event) => setFormState((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="What should students prepare for?"
                rows={3}
              />
            </div>
            {formError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleDialogOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{dialogMode === "edit" ? "Save changes" : "Add period"}</Button>
            </DialogFooter>
          </form>

          <datalist id="teacher-suggestions">
            {teacherOptions.map((teacher) => (
              <option key={teacher} value={teacher} />
            ))}
          </datalist>
          <datalist id="room-suggestions">
            {roomOptions.map((room) => (
              <option key={room} value={room} />
            ))}
          </datalist>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getEntryStyle(entry: TimetableEntry): SubjectVisualStyle {
  switch (entry.type) {
    case "break":
      return BREAK_STYLE
    case "club":
      return CLUB_STYLE
    case "assessment":
      return ASSESSMENT_STYLE
    default:
      return getSubjectStyle(entry.subject)
  }
}

function getSubjectStyle(subject: string): SubjectVisualStyle {
  const key = subject.trim().toLowerCase()
  if (!key) {
    return SUBJECT_STYLE_POOL[0]
  }

  const existing = SUBJECT_STYLE_CACHE.get(key)
  if (existing) {
    return existing
  }

  const index = Math.abs(hashString(key)) % SUBJECT_STYLE_POOL.length
  const style = SUBJECT_STYLE_POOL[index]
  SUBJECT_STYLE_CACHE.set(key, style)
  return style
}

function hashString(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return hash
}

function parseTime(time: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) {
    return null
  }
  const hours = Number(match[1])
  const minutes = Number(match[2])
  return hours * 60 + minutes
}

function addMinutes(time: string, minutesToAdd: number): string {
  const baseMinutes = parseTime(time)
  if (baseMinutes === null) {
    return time
  }
  const totalMinutes = (baseMinutes + minutesToAdd + 1440) % 1440
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
}

function differenceInMinutes(start: string, end: string): number {
  const startMinutes = parseTime(start)
  const endMinutes = parseTime(end)
  if (startMinutes === null || endMinutes === null) {
    return 0
  }
  return Math.max(0, endMinutes - startMinutes)
}

function formatDuration(start: string, end: string): string {
  const minutes = differenceInMinutes(start, end)
  if (minutes <= 0) return "0 min"
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (hours === 0) return `${remaining} min`
  if (remaining === 0) return `${hours} hr${hours > 1 ? "s" : ""}`
  return `${hours}h ${remaining}m`
}

function formatTimeRange(start: string, end: string): string {
  const formattedStart = formatTime(start)
  const formattedEnd = formatTime(end)
  if (!formattedStart || !formattedEnd) {
    return `${start} – ${end}`
  }
  return `${formattedStart} – ${formattedEnd}`
}

function formatTime(value: string): string | null {
  const minutes = parseTime(value)
  if (minutes === null) {
    return null
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  const period = hours >= 12 ? "PM" : "AM"
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12
  return `${twelveHour}:${mins.toString().padStart(2, "0")} ${period}`
}
