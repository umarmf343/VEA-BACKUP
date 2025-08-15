"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { BookOpen, Search, Plus, Users, Calendar, AlertTriangle } from "lucide-react"
import { DatabaseManager } from "@/lib/database-manager"

interface LibrarianDashboardProps {
  librarian: {
    id: string
    name: string
    email: string
  }
}

export function LibrarianDashboard({ librarian }: LibrarianDashboardProps) {
  const [selectedTab, setSelectedTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [books, setBooks] = useState<any[]>([])
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const dbManager = DatabaseManager.getInstance()

  useEffect(() => {
    loadLibraryData()

    const unsubscribeBooks = dbManager.subscribe("books", (data) => {
      setBooks(data || [])
    })

    const unsubscribeBorrowed = dbManager.subscribe("borrowedBooks", (data) => {
      setBorrowedBooks(data || [])
    })

    const unsubscribeRequests = dbManager.subscribe("bookRequests", (data) => {
      setRequests(data || [])
    })

    return () => {
      unsubscribeBooks()
      unsubscribeBorrowed()
      unsubscribeRequests()
    }
  }, [])

  const loadLibraryData = async () => {
    try {
      setLoading(true)
      const booksData = await dbManager.getBooks()
      const borrowedData = await dbManager.getBorrowedBooks()
      const requestsData = await dbManager.getBookRequests()

      setBooks(booksData)
      setBorrowedBooks(borrowedData)
      setRequests(requestsData)
    } catch (error) {
      console.error("Error loading library data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBook = async (bookData: any) => {
    try {
      await dbManager.addBook({
        ...bookData,
        id: Date.now().toString(),
        addedBy: librarian.id,
        addedDate: new Date().toISOString(),
      })
      // Data will update automatically via real-time listener
    } catch (error) {
      console.error("Error adding book:", error)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      await dbManager.updateBookRequest(requestId, {
        status: "approved",
        approvedBy: librarian.id,
        approvedDate: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error approving request:", error)
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    try {
      await dbManager.updateBookRequest(requestId, {
        status: "rejected",
        rejectedBy: librarian.id,
        rejectedDate: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Error rejecting request:", error)
    }
  }

  const handleReturnBook = async (borrowId: string) => {
    try {
      await dbManager.returnBook(borrowId, {
        returnedDate: new Date().toISOString(),
        returnedTo: librarian.id,
      })
    } catch (error) {
      console.error("Error returning book:", error)
    }
  }

  const overdueBooks = borrowedBooks.filter((book) => {
    const dueDate = new Date(book.dueDate)
    return dueDate < new Date() && book.status === "active"
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2d682d] mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading library data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#2d682d] to-[#b29032] text-white p-6 rounded-lg">
        <h1 className="text-2xl font-bold">Welcome, {librarian.name}</h1>
        <p className="text-green-100">Library Management - VEA 2025</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{books.length}</p>
                <p className="text-sm text-gray-600">Total Books</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{borrowedBooks.length}</p>
                <p className="text-sm text-gray-600">Borrowed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{requests.length}</p>
                <p className="text-sm text-gray-600">Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{overdueBooks.length}</p>
                <p className="text-sm text-gray-600">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="books">Books</TabsTrigger>
          <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {borrowedBooks.slice(0, 3).map((book, index) => (
                    <div key={index} className="p-2 bg-green-50 border-l-4 border-[#2d682d] rounded">
                      <p className="text-sm font-medium">Book Borrowed</p>
                      <p className="text-xs text-gray-600">
                        {book.bookTitle} by {book.studentName}
                      </p>
                    </div>
                  ))}
                  {requests
                    .filter((r) => r.status === "pending")
                    .slice(0, 2)
                    .map((request, index) => (
                      <div key={index} className="p-2 bg-yellow-50 border-l-4 border-[#b29032] rounded">
                        <p className="text-sm font-medium">New Request</p>
                        <p className="text-xs text-gray-600">
                          {request.bookTitle} by {request.studentName}
                        </p>
                      </div>
                    ))}
                  {overdueBooks.slice(0, 1).map((book, index) => (
                    <div key={index} className="p-2 bg-red-50 border-l-4 border-red-500 rounded">
                      <p className="text-sm font-medium">Overdue Alert</p>
                      <p className="text-xs text-gray-600">
                        {book.bookTitle} by {book.studentName}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Popular Books</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {books.slice(0, 5).map((book) => (
                    <div key={book.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium">{book.title}</p>
                        <p className="text-xs text-gray-600">{book.author}</p>
                      </div>
                      <Badge variant="outline">{(book.copies || 0) - (book.available || 0)} borrowed</Badge>
                    </div>
                  ))}
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
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search books..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button
                    className="bg-[#b29032] hover:bg-[#b29032]/90"
                    onClick={() => {
                      const title = prompt("Enter book title:")
                      const author = prompt("Enter author:")
                      const isbn = prompt("Enter ISBN:")
                      const copies = prompt("Enter number of copies:")
                      const category = prompt("Enter category:")

                      if (title && author && isbn && copies && category) {
                        handleAddBook({
                          title,
                          author,
                          isbn,
                          copies: Number.parseInt(copies),
                          available: Number.parseInt(copies),
                          category,
                        })
                      }
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Book
                  </Button>
                </div>

                <div className="space-y-2">
                  {books
                    .filter(
                      (book) =>
                        book.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        book.author?.toLowerCase().includes(searchTerm.toLowerCase()),
                    )
                    .map((book) => (
                      <div key={book.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-medium">{book.title}</h3>
                          <p className="text-sm text-gray-600">by {book.author}</p>
                          <p className="text-xs text-gray-500">ISBN: {book.isbn}</p>
                          <Badge variant="outline" className="mt-1">
                            {book.category}
                          </Badge>
                        </div>
                        <div className="text-center mr-4">
                          <p className="text-sm font-medium">Available</p>
                          <p className="text-lg font-bold text-[#2d682d]">
                            {book.available || 0}/{book.copies || 0}
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
                </div>
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
            <CardContent>
              <div className="space-y-4">
                {borrowedBooks.map((record) => (
                  <div key={record.id} className="flex justify-between items-center p-4 border rounded-lg">
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
                      <Badge
                        variant={
                          new Date(record.dueDate) < new Date() && record.status === "active"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {new Date(record.dueDate) < new Date() && record.status === "active"
                          ? "overdue"
                          : record.status}
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Book Requests</CardTitle>
              <CardDescription>Manage student book requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {requests.map((request) => (
                  <div key={request.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{request.bookTitle}</h3>
                      <p className="text-sm text-gray-600">
                        {request.studentName} ({request.studentClass})
                      </p>
                      <p className="text-xs text-gray-500">Requested: {request.requestDate}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={request.status === "pending" ? "secondary" : "default"}>{request.status}</Badge>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
