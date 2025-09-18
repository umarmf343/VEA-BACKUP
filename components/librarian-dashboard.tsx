"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Archive, BookOpen, Plus, Search, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  createLibraryBook,
  enrichBookRequests,
  enrichBorrowedBooks,
  enrichLibraryBooks,
  getLibraryState,
  markBorrowedBookReturned,
  updateBookRequestStatus,
  type BookRequestRecord,
  type BorrowedBookRecord,
  type LibraryBookRecord,
} from "@/lib/librarian-service"
import {
  DatabaseManager,
  type Book,
  type BookRequest,
  type BorrowedBook,
  type Student,
} from "@/lib/database-manager"

interface LibrarianDashboardProps {
  librarian: {
    id: string
    name: string
    email: string
  }
  initialData?: {
    books: LibraryBookRecord[]
    borrowed: BorrowedBookRecord[]
    requests: BookRequestRecord[]
  }
}

export function LibrarianDashboard({ librarian, initialData }: LibrarianDashboardProps) {
  const managerRef = useRef(DatabaseManager.getInstance())
  const [selectedTab, setSelectedTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [books, setBooks] = useState<LibraryBookRecord[]>(() => initialData?.books ?? [])
  const [borrowedBooks, setBorrowedBooks] = useState<BorrowedBookRecord[]>(() => initialData?.borrowed ?? [])
  const [requests, setRequests] = useState<BookRequestRecord[]>(() => initialData?.requests ?? [])
  const [loading, setLoading] = useState(() => !initialData)

  const rawBooksRef = useRef<Book[]>([])
  const rawBorrowedRef = useRef<BorrowedBook[]>([])
  const rawRequestsRef = useRef<BookRequest[]>([])
  const studentsRef = useRef<Student[]>([])

  useEffect(() => {
    let active = true

    async function loadLibraryData() {
      try {
        if (!initialData) {
          setLoading(true)
        }

        const state = await getLibraryState()
        if (!active) return

        rawBooksRef.current = state.context.books
        rawBorrowedRef.current = state.context.borrowed
        rawRequestsRef.current = state.context.requests
        studentsRef.current = state.context.students

        setBooks(state.books)
        setBorrowedBooks(state.borrowed)
        setRequests(state.requests)
      } catch (error) {
        console.error("Error loading library data:", error)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadLibraryData()

    const unsubscribeBooks = managerRef.current.subscribe("books", (data) => {
      rawBooksRef.current = Array.isArray(data) ? (data as Book[]) : []
      setBooks(enrichLibraryBooks(rawBooksRef.current))
      setBorrowedBooks(
        enrichBorrowedBooks(rawBorrowedRef.current, {
          books: rawBooksRef.current,
          students: studentsRef.current,
        }),
      )
      setRequests(
        enrichBookRequests(rawRequestsRef.current, {
          books: rawBooksRef.current,
          students: studentsRef.current,
        }),
      )
    })

    const unsubscribeBorrowed = managerRef.current.subscribe("borrowedBooks", (data) => {
      rawBorrowedRef.current = Array.isArray(data) ? (data as BorrowedBook[]) : []
      setBorrowedBooks(
        enrichBorrowedBooks(rawBorrowedRef.current, {
          books: rawBooksRef.current,
          students: studentsRef.current,
        }),
      )
    })

    const unsubscribeRequests = managerRef.current.subscribe("bookRequests", (data) => {
      rawRequestsRef.current = Array.isArray(data) ? (data as BookRequest[]) : []
      setRequests(
        enrichBookRequests(rawRequestsRef.current, {
          books: rawBooksRef.current,
          students: studentsRef.current,
        }),
      )
    })

    return () => {
      active = false
      unsubscribeBooks()
      unsubscribeBorrowed()
      unsubscribeRequests()
    }
  }, [initialData])

  const totalCopies = books.reduce((sum, book) => sum + book.copies, 0)
  const availableCopies = books.reduce((sum, book) => sum + book.available, 0)
  const activeLoans = borrowedBooks.filter((record) => record.status === "active")
  const pendingRequests = requests.filter((request) => request.status === "pending")
  const overdueLoans = activeLoans.filter((record) => record.isOverdue)

  const handleAddBook = async (bookData: {
    title: string
    author: string
    isbn?: string | null
    copies: number
    category: string
  }) => {
    try {
      if (!bookData.title || !bookData.author || !bookData.category) {
        return
      }

      const copies = Number.isFinite(bookData.copies) ? Math.max(1, Math.floor(bookData.copies)) : 1

      await createLibraryBook({
        title: bookData.title.trim(),
        author: bookData.author.trim(),
        category: bookData.category.trim(),
        copies,
        isbn: bookData.isbn?.trim() || undefined,
        addedBy: librarian.id,
      })
    } catch (error) {
      console.error("Error adding book:", error)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await updateBookRequestStatus(requestId, "approved", librarian.id)
    } catch (error) {
      console.error("Error approving request:", error)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await updateBookRequestStatus(requestId, "rejected", librarian.id)
    } catch (error) {
      console.error("Error rejecting request:", error)
    }
  }

  const handleReturnBook = async (borrowId: string) => {
    try {
      await markBorrowedBookReturned(borrowId)
    } catch (error) {
      console.error("Error returning book:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#2d682d]"></div>
          <p className="mt-2 text-gray-600">Loading library data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gradient-to-r from-[#2d682d] to-[#b29032] p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {librarian.name}</h1>
        <p className="text-green-100">Library Management - VEA 2025</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center space-x-2 p-4">
            <BookOpen className="h-8 w-8 text-[#2d682d]" />
            <div>
              <p className="text-2xl font-bold text-[#2d682d]">{books.length}</p>
              <p className="text-sm text-gray-600">Titles Catalogued</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center space-x-2 p-4">
            <Archive className="h-8 w-8 text-[#b29032]" />
            <div>
              <p className="text-2xl font-bold text-[#b29032]">{availableCopies}</p>
              <p className="text-sm text-gray-600">Copies Available</p>
              <p className="text-xs text-gray-500">{totalCopies} total copies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center space-x-2 p-4">
            <Users className="h-8 w-8 text-[#2d682d]" />
            <div>
              <p className="text-2xl font-bold text-[#2d682d]">{activeLoans.length}</p>
              <p className="text-sm text-gray-600">Active Loans</p>
              <p className="text-xs text-gray-500">
                Overdue: <span className={overdueLoans.length ? "text-red-500" : "text-gray-500"}>{overdueLoans.length}</span>
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center space-x-2 p-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-500">{pendingRequests.length}</p>
              <p className="text-sm text-gray-600">Pending Requests</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {activeLoans.slice(0, 3).map((record) => (
                    <div key={record.id} className="rounded border-l-4 border-[#2d682d] bg-green-50 p-2">
                      <p className="text-sm font-medium">Book Borrowed</p>
                      <p className="text-xs text-gray-600">
                        {record.bookTitle} by {record.studentName}
                      </p>
                    </div>
                  ))}
                  {pendingRequests.slice(0, 2).map((request) => (
                    <div key={request.id} className="rounded border-l-4 border-[#b29032] bg-yellow-50 p-2">
                      <p className="text-sm font-medium">New Request</p>
                      <p className="text-xs text-gray-600">
                        {request.bookTitle} by {request.studentName}
                      </p>
                    </div>
                  ))}
                  {overdueLoans.slice(0, 1).map((record) => (
                    <div key={record.id} className="rounded border-l-4 border-red-500 bg-red-50 p-2">
                      <p className="text-sm font-medium">Overdue Alert</p>
                      <p className="text-xs text-gray-600">
                        {record.bookTitle} by {record.studentName}
                      </p>
                    </div>
                  ))}
                  {!activeLoans.length && !pendingRequests.length && !overdueLoans.length ? (
                    <p className="text-sm text-gray-500">No recent activity.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Popular Books</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {books
                    .slice()
                    .sort((a, b) => b.borrowedCount - a.borrowedCount)
                    .slice(0, 5)
                    .map((book) => (
                      <div key={book.id} className="flex items-center justify-between rounded bg-gray-50 p-2">
                        <div>
                          <p className="text-sm font-medium">{book.title}</p>
                          <p className="text-xs text-gray-600">{book.author}</p>
                        </div>
                        <Badge variant="outline">{book.borrowedCount} borrowed</Badge>
                      </div>
                    ))}
                  {!books.length ? <p className="text-sm text-gray-500">No books in catalogue.</p> : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="books" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Book Management</CardTitle>
              <CardDescription>Manage library books and inventory</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search books..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button
                  className="bg-[#b29032] hover:bg-[#b29032]/90"
                  onClick={async () => {
                    const title = prompt("Enter book title:")?.trim()
                    const author = prompt("Enter author:")?.trim()
                    const isbn = prompt("Enter ISBN (optional):")?.trim()
                    const copiesValue = prompt("Enter number of copies:")?.trim()
                    const category = prompt("Enter category:")?.trim()

                    const copies = copiesValue ? Number.parseInt(copiesValue, 10) : 1

                    if (title && author && category) {
                      await handleAddBook({
                        title,
                        author,
                        isbn: isbn ?? undefined,
                        copies,
                        category,
                      })
                    }
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Book
                </Button>
              </div>

              <div className="space-y-2">
                {books
                  .filter((book) => {
                    const term = searchTerm.toLowerCase().trim()
                    if (!term) return true
                    return (
                      book.title.toLowerCase().includes(term) ||
                      book.author.toLowerCase().includes(term) ||
                      (book.isbn?.toLowerCase().includes(term) ?? false)
                    )
                  })
                  .map((book) => (
                    <div key={book.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <h3 className="font-medium">{book.title}</h3>
                        <p className="text-sm text-gray-600">by {book.author}</p>
                        {book.isbn ? <p className="text-xs text-gray-500">ISBN: {book.isbn}</p> : null}
                        <Badge variant="outline" className="mt-1">
                          {book.category}
                        </Badge>
                      </div>
                      <div className="mr-4 text-center">
                        <p className="text-sm font-medium">Availability</p>
                        <p className="text-lg font-bold text-[#2d682d]">
                          {book.available}/{book.copies}
                        </p>
                      </div>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                        <Button size="sm" className="bg-[#2d682d] hover:bg-[#2d682d]/90">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                {!books.length ? <p className="text-sm text-gray-500">No books found.</p> : null}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="borrowed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Borrowed Books</CardTitle>
              <CardDescription>Track borrowed books and due dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {borrowedBooks.map((record) => (
                <div key={record.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{record.bookTitle}</h3>
                    <p className="text-sm text-gray-600">
                      {record.studentName} ({record.studentClass})
                    </p>
                    <p className="text-xs text-gray-500">
                      Borrowed: {record.borrowDate} | Due: {record.dueDate}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={record.isOverdue ? "destructive" : "default"}>
                      {record.isOverdue ? "overdue" : record.status}
                    </Badge>
                    {record.status === "active" && (
                      <Button
                        size="sm"
                        className="bg-[#2d682d] hover:bg-[#2d682d]/90"
                        onClick={() => handleReturnBook(record.id)}
                      >
                        Return Book
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {!borrowedBooks.length ? <p className="text-sm text-gray-500">No active loans.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Book Requests</CardTitle>
              <CardDescription>Manage student book requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex-1">
                    <h3 className="font-medium">{request.bookTitle}</h3>
                    <p className="text-sm text-gray-600">
                      {request.studentName} ({request.studentClass})
                    </p>
                    <p className="text-xs text-gray-500">Requested: {request.requestDate}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={request.status === "pending" ? "secondary" : "outline"}>{request.status}</Badge>
                    {request.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleRejectRequest(request.id)}>
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#2d682d] hover:bg-[#2d682d]/90"
                          onClick={() => handleApproveRequest(request.id)}
                        >
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {!requests.length ? <p className="text-sm text-gray-500">No requests at the moment.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
