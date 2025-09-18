import {
  DatabaseManager,
  type Book,
  type BookRequest,
  type BorrowedBook,
  type Student,
} from "./database-manager"

export interface LibrarianProfile {
  id: string
  name: string
  email: string
  phone: string
  extension: string
  officeLocation: string
  lastLogin: string
  responsibilities: string[]
}

export interface LibraryBookRecord extends Book {
  available: number
  borrowedCount: number
  availabilityRate: number
}

export interface BorrowedBookRecord extends BorrowedBook {
  borrowDate: string
  bookTitle: string
  studentName: string
  studentClass: string
  daysUntilDue: number | null
  isOverdue: boolean
}

export interface BookRequestRecord extends BookRequest {
  bookTitle: string
  studentName: string
  studentClass: string
  requestDate: string
  isPending: boolean
}

export interface LibrarySnapshot {
  totalTitles: number
  totalCopies: number
  availableCopies: number
  borrowedActive: number
  pendingRequests: number
  overdueLoans: number
}

export interface LibraryState {
  books: LibraryBookRecord[]
  borrowed: BorrowedBookRecord[]
  requests: BookRequestRecord[]
  context: {
    books: Book[]
    borrowed: BorrowedBook[]
    requests: BookRequest[]
    students: Student[]
  }
}

const db = DatabaseManager.getInstance()

function safeDate(value: string | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function titleFromBookId(bookId: string, books: Book[]) {
  return books.find((book) => book.id === bookId)?.title ?? "Unknown Title"
}

function studentFromId(studentId: string, students: Student[]) {
  return students.find((student) => student.id === studentId)
}

function formatClass(student: Student | undefined) {
  if (!student) return "—"
  return student.section ? `${student.class} (${student.section})` : student.class
}

function normaliseBorrowStatus(status: BorrowedBook["status"] | "borrowed") {
  return status === "returned" ? "returned" : "active"
}

export function enrichLibraryBooks(books: Book[]): LibraryBookRecord[] {
  return books.map((book) => {
    const total = Number.isFinite(book.copies) ? Number(book.copies) : 0
    const available = Math.max(0, Math.min(total, Number(book.availableCopies ?? 0)))
    const borrowedCount = Math.max(0, total - available)
    const availabilityRate = total > 0 ? Math.round((available / total) * 1000) / 10 : 0

    return {
      ...book,
      copies: total,
      availableCopies: available,
      available,
      borrowedCount,
      availabilityRate,
      status: book.status ?? (available > 0 ? "available" : "unavailable"),
      tags: book.tags ? [...book.tags] : undefined,
    }
  })
}

export function enrichBorrowedBooks(
  borrowed: BorrowedBook[],
  deps: { books: Book[]; students: Student[] },
): BorrowedBookRecord[] {
  return borrowed.map((record) => {
    const status = normaliseBorrowStatus(record.status)
    const borrowDate = record.borrowedAt ?? (record as any).borrowDate ?? ""
    const borrowDateValue = safeDate(borrowDate)
    const dueDateValue = safeDate(record.dueDate)
    const now = new Date()
    let daysUntilDue: number | null = null
    let isOverdue = false

    if (dueDateValue) {
      const diff = Math.floor((dueDateValue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      daysUntilDue = diff
      isOverdue = diff < 0 && status === "active"
    }

    return {
      ...record,
      status,
      borrowDate: borrowDateValue ? borrowDateValue.toISOString().slice(0, 10) : borrowDate,
      bookTitle: titleFromBookId(record.bookId, deps.books),
      studentName: studentFromId(record.studentId, deps.students)?.name ?? "Unknown Student",
      studentClass: formatClass(studentFromId(record.studentId, deps.students)),
      daysUntilDue,
      isOverdue,
    }
  })
}

export function enrichBookRequests(
  requests: BookRequest[],
  deps: { books: Book[]; students: Student[] },
): BookRequestRecord[] {
  return requests.map((request) => {
    const student = studentFromId(request.studentId, deps.students)
    const requestedAt = request.requestedAt ?? (request as any).requestDate ?? ""
    const requestDateValue = safeDate(requestedAt)

    return {
      ...request,
      bookTitle: titleFromBookId(request.bookId, deps.books),
      studentName: student?.name ?? "Unknown Student",
      studentClass: formatClass(student),
      requestDate: requestDateValue ? requestDateValue.toISOString().slice(0, 10) : requestedAt,
      isPending: request.status === "pending",
    }
  })
}

export function buildLibrarySnapshot(
  data: Pick<LibraryState, "books" | "borrowed" | "requests">,
): LibrarySnapshot {
  const totalCopies = data.books.reduce((sum, book) => sum + book.copies, 0)
  const availableCopies = data.books.reduce((sum, book) => sum + book.available, 0)
  const totalTitles = data.books.length
  const borrowedActive = data.borrowed.filter((record) => record.status === "active").length
  const overdueLoans = data.borrowed.filter((record) => record.isOverdue).length
  const pendingRequests = data.requests.filter((request) => request.status === "pending").length

  return {
    totalTitles,
    totalCopies,
    availableCopies,
    borrowedActive,
    pendingRequests,
    overdueLoans,
  }
}

export async function getLibraryState(): Promise<LibraryState> {
  const [books, borrowed, requests, students] = await Promise.all([
    db.getBooks(),
    db.getBorrowedBooks(),
    db.getBookRequests(),
    db.getStudents(),
  ])

  return {
    books: enrichLibraryBooks(books),
    borrowed: enrichBorrowedBooks(borrowed, { books, students }),
    requests: enrichBookRequests(requests, { books, students }),
    context: {
      books,
      borrowed,
      requests,
      students,
    },
  }
}

export async function listLibraryBooks() {
  const { books } = await getLibraryState()
  return books
}

export async function listBorrowedBooks() {
  const { borrowed } = await getLibraryState()
  return borrowed
}

export async function listBookRequests() {
  const { requests } = await getLibraryState()
  return requests
}

export async function getLibrarianProfile(): Promise<LibrarianProfile> {
  return {
    id: "usr-librarian-1",
    name: "Chinonso Ibeh",
    email: "librarian@vea.edu.ng",
    phone: "+234 803 444 1188",
    extension: "1402",
    officeLocation: "Library Wing, Level 1",
    lastLogin: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    responsibilities: [
      "Collection management",
      "Student lending",
      "Digital archive supervision",
    ],
  }
}

export async function getLibrarySnapshot(): Promise<LibrarySnapshot> {
  const state = await getLibraryState()
  return buildLibrarySnapshot(state)
}

export interface CreateLibraryBookInput {
  title: string
  author: string
  category: string
  copies: number
  isbn?: string
  addedBy?: string
  tags?: string[]
}

export async function createLibraryBook(input: CreateLibraryBookInput) {
  const payload = {
    title: input.title,
    author: input.author,
    category: input.category,
    copies: input.copies,
    availableCopies: input.copies,
    status: "available" as const,
    isbn: input.isbn,
    addedBy: input.addedBy,
    addedDate: new Date().toISOString(),
    tags: input.tags,
  }

  return db.addBook(payload)
}

export async function updateBookRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
  actorId: string,
) {
  const updates =
    status === "approved"
      ? { status, approvedBy: actorId }
      : { status, rejectedBy: actorId }

  return db.updateBookRequest(requestId, updates)
}

export async function markBorrowedBookReturned(borrowId: string) {
  return db.returnBook(borrowId, {})
}
