"use client"

import { useEffect, useMemo, useState } from "react"
import {
  DollarSign,
  Receipt as ReceiptIcon,
  TrendingUp,
  Users,
  Download,
  Search,
  Plus,
  Printer,
  Edit,
  Loader2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useNotification } from "@/hooks/use-notification"
import {
  type AccountantPaymentRecord,
  type AccountantProfile,
  type AccountantReceiptRecord,
  enrichPayments,
  enrichReceipts,
  generateAccountantReport,
  recordAccountantPayment,
  saveAccountantFeeStructure,
  type PaymentMethod,
} from "@/lib/accountant-service"
import {
  DatabaseManager,
  type FeeStructure,
  type Payment,
  type PaymentStatus,
  type Receipt as ReceiptRecord,
  type Student,
} from "@/lib/database-manager"

const PAYMENT_STATUS_BADGE: Record<PaymentStatus, "default" | "secondary" | "destructive"> = {
  paid: "default",
  pending: "secondary",
  failed: "destructive",
}

const ONLINE_METHODS = new Set(["bank_transfer", "card", "online"])

type FeeFormState = {
  id?: string
  class: string
  tuition: number
  development: number
  exam: number
  sports: number
  library: number
}

type PaymentFormState = {
  studentId: string
  amount: string
  method: PaymentMethod
  status: PaymentStatus
  description: string
  term: string
  generateReceipt: boolean
}

type PrintableRecord = {
  studentName: string
  amount: number
  reference: string
  date: string
}

const DEFAULT_FEE_FORM: FeeFormState = {
  class: "",
  tuition: 0,
  development: 0,
  exam: 0,
  sports: 0,
  library: 0,
}

function createDefaultPaymentForm(): PaymentFormState {
  return {
    studentId: "",
    amount: "",
    method: "bank_transfer",
    status: "paid",
    description: "School Fees",
    term: `${new Date().getFullYear()}-term-2`,
    generateReceipt: true,
  }
}

function formatCurrency(amount: number) {
  return `₦${Math.round(amount).toLocaleString("en-NG")}`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value || "—"
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

const REPORT_BUTTONS: Array<{ type: string; label: string; className: string }> = [
  { type: "monthly-revenue", label: "Monthly Revenue Report", className: "bg-[#2d682d] hover:bg-[#2d682d]/90" },
  { type: "outstanding-payments", label: "Outstanding Payments", className: "bg-[#b29032] hover:bg-[#b29032]/90" },
  { type: "class-wise-collection", label: "Class-wise Collection", className: "bg-[#2d682d] hover:bg-[#2d682d]/90" },
  { type: "payment-method-analysis", label: "Payment Method Analysis", className: "bg-[#b29032] hover:bg-[#b29032]/90" },
  { type: "fee-defaulters", label: "Fee Defaulters Report", className: "bg-[#2d682d] hover:bg-[#2d682d]/90" },
  { type: "annual-financial-summary", label: "Annual Financial Summary", className: "bg-[#b29032] hover:bg-[#b29032]/90" },
]

interface AccountantDashboardProps {
  accountant: AccountantProfile
}

export function AccountantDashboard({ accountant }: AccountantDashboardProps) {
  const dbManager = DatabaseManager.getInstance()
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotification()

  const [selectedTab, setSelectedTab] = useState("overview")
  const [showFeeDialog, setShowFeeDialog] = useState(false)
  const [showReceiptDialog, setShowReceiptDialog] = useState(false)
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [feeForm, setFeeForm] = useState<FeeFormState>(DEFAULT_FEE_FORM)
  const [paymentForm, setPaymentForm] = useState<PaymentFormState>(createDefaultPaymentForm)
  const [paymentsRaw, setPaymentsRaw] = useState<Payment[]>([])
  const [receiptsRaw, setReceiptsRaw] = useState<ReceiptRecord[]>([])
  const [feeStructure, setFeeStructure] = useState<FeeStructure[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [isSavingFee, setIsSavingFee] = useState(false)
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [generatingReport, setGeneratingReport] = useState<string | null>(null)
  const [selectedRecord, setSelectedRecord] = useState<PrintableRecord | null>(null)
  const [paymentSearch, setPaymentSearch] = useState("")

  useEffect(() => {
    let unsubscribePayments = () => {}
    let unsubscribeReceipts = () => {}
    let unsubscribeFees = () => {}

    const loadFinancialData = async () => {
      try {
        setLoading(true)
        const [paymentsData, receiptsData, feesData, studentsData] = await Promise.all([
          dbManager.getPayments(),
          dbManager.getReceipts(),
          dbManager.getFeeStructure(),
          dbManager.getStudents(),
        ])

        setPaymentsRaw(paymentsData)
        setReceiptsRaw(receiptsData)
        setFeeStructure(feesData)
        setStudents(studentsData)
      } catch (error) {
        console.error("Error loading financial data:", error)
        notifyError("Unable to load financial data.", {
          description: error instanceof Error ? error.message : "Please try again shortly.",
        })
      } finally {
        setLoading(false)
      }
    }

    loadFinancialData()

    unsubscribePayments = dbManager.subscribe("payments", (data) => {
      setPaymentsRaw(data as Payment[])
    })

    unsubscribeReceipts = dbManager.subscribe("receipts", (data) => {
      setReceiptsRaw(data as ReceiptRecord[])
    })

    unsubscribeFees = dbManager.subscribe("feeStructure", (data) => {
      setFeeStructure(data as FeeStructure[])
    })

    return () => {
      unsubscribePayments()
      unsubscribeReceipts()
      unsubscribeFees()
    }
  }, [dbManager, notifyError])

  const payments = useMemo<AccountantPaymentRecord[]>(
    () => enrichPayments(paymentsRaw, students),
    [paymentsRaw, students],
  )

  const receipts = useMemo<AccountantReceiptRecord[]>(
    () => enrichReceipts(receiptsRaw, paymentsRaw, students),
    [receiptsRaw, paymentsRaw, students],
  )

  const paymentSearchTerm = paymentSearch.trim().toLowerCase()
  const filteredPayments = useMemo(() => {
    if (!paymentSearchTerm) {
      return payments
    }

    return payments.filter((payment) =>
      [payment.studentName, payment.studentClass, payment.reference, payment.typeLabel]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(paymentSearchTerm)),
    )
  }, [paymentSearchTerm, payments])

  const totalRevenue = useMemo(
    () => paymentsRaw.filter((payment) => payment.status === "paid").reduce((sum, payment) => sum + payment.amount, 0),
    [paymentsRaw],
  )

  const pendingPayments = useMemo(
    () => paymentsRaw.filter((payment) => payment.status === "pending").length,
    [paymentsRaw],
  )

  const collectionRate = useMemo(() => {
    if (paymentsRaw.length === 0) {
      return 0
    }
    const paid = paymentsRaw.filter((payment) => payment.status === "paid").length
    return Math.round((paid / paymentsRaw.length) * 1000) / 10
  }, [paymentsRaw])

  const classOptions = useMemo(() => {
    const options = new Set<string>()
    students.forEach((student) => {
      if (student.class) {
        options.add(student.class)
      }
    })
    feeStructure.forEach((fee) => {
      if (fee.class) {
        options.add(fee.class)
      }
    })
    if (feeForm.class) {
      options.add(feeForm.class)
    }
    return Array.from(options).sort((a, b) => a.localeCompare(b))
  }, [students, feeStructure, feeForm.class])

  const onlinePaymentCount = useMemo(
    () => payments.filter((payment) => ONLINE_METHODS.has(payment.method)).length,
    [payments],
  )

  const offlinePaymentCount = useMemo(
    () => payments.length - onlinePaymentCount,
    [payments.length, onlinePaymentCount],
  )

  const handleUpdateFeeStructure = async () => {
    if (!feeForm.class.trim()) {
      notifyWarning("Select a class before saving the fee structure.")
      return
    }

    setIsSavingFee(true)
    try {
      await saveAccountantFeeStructure({
        id: feeForm.id,
        class: feeForm.class.trim(),
        tuition: feeForm.tuition,
        development: feeForm.development,
        exam: feeForm.exam,
        sports: feeForm.sports,
        library: feeForm.library,
      })

      notifySuccess("Fee structure updated", {
        description: `${feeForm.class} total set to ${formatCurrency(
          feeForm.tuition + feeForm.development + feeForm.exam + feeForm.sports + feeForm.library,
        )}`,
      })
      setShowFeeDialog(false)
      setFeeForm(DEFAULT_FEE_FORM)
    } catch (error) {
      console.error("Error updating fee structure:", error)
      notifyError("Unable to update fee structure.", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsSavingFee(false)
    }
  }

  const handleRecordPayment = async () => {
    if (!paymentForm.studentId) {
      notifyWarning("Select a student before recording the payment.")
      return
    }

    const amount = Number(paymentForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      notifyWarning("Enter a valid payment amount greater than zero.")
      return
    }

    setIsSavingPayment(true)
    try {
      const payment = await recordAccountantPayment({
        studentId: paymentForm.studentId,
        amount,
        method: paymentForm.method,
        status: paymentForm.status,
        description: paymentForm.description.trim() || "School Fees",
        term: paymentForm.term.trim() || `${new Date().getFullYear()}-term-2`,
        generateReceipt: paymentForm.generateReceipt,
      })

      notifySuccess("Payment recorded", {
        description: `Reference ${payment.reference} saved successfully.`,
      })
      setShowPaymentDialog(false)
      setPaymentForm(createDefaultPaymentForm())
    } catch (error) {
      console.error("Error recording payment:", error)
      notifyError("Unable to record payment.", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setIsSavingPayment(false)
    }
  }

  const handleDownloadReceipt = async (record: AccountantPaymentRecord | AccountantReceiptRecord) => {
    try {
      if ("paymentId" in record) {
        notifyInfo("Receipt download ready", {
          description: `Reference ${record.reference}`,
        })
        console.log("Preparing existing receipt for download", record)
      } else {
        const generated = await dbManager.generateReceipt(record)
        notifySuccess("Receipt generated", {
          description: `Receipt ${generated.id} is now available in the receipts tab.`,
        })
      }
    } catch (error) {
      console.error("Error generating receipt:", error)
      notifyError("Unable to prepare receipt.", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    }
  }

  const handlePrintReceipt = (record: AccountantPaymentRecord | AccountantReceiptRecord) => {
    if ("paymentId" in record) {
      setSelectedRecord({
        studentName: record.studentName,
        amount: record.amount,
        reference: record.reference,
        date: record.issuedDate,
      })
    } else {
      setSelectedRecord({
        studentName: record.studentName,
        amount: record.amount,
        reference: record.reference,
        date: record.date,
      })
    }
    setShowReceiptDialog(true)
  }

  const handleGenerateReport = async (reportType: string) => {
    setGeneratingReport(reportType)
    try {
      const report = await generateAccountantReport(reportType)
      notifySuccess("Report generated", {
        description: `${report.type.replace(/-/g, " ")} ready for review.`,
      })
    } catch (error) {
      console.error("Error generating report:", error)
      notifyError("Unable to generate report.", {
        description: error instanceof Error ? error.message : "Please try again.",
      })
    } finally {
      setGeneratingReport(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-[#2d682d]" />
          <p className="mt-2 text-gray-600">Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gradient-to-r from-[#2d682d] to-[#b29032] p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {accountant.name}</h1>
        <p className="text-green-100">Financial Management – VEA 2025</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{formatCurrency(totalRevenue)}</p>
                <p className="text-sm text-gray-600">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{pendingPayments}</p>
                <p className="text-sm text-gray-600">Pending Payments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ReceiptIcon className="h-8 w-8 text-[#2d682d]" />
              <div>
                <p className="text-2xl font-bold text-[#2d682d]">{receipts.length}</p>
                <p className="text-sm text-gray-600">Receipts Issued</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-[#b29032]" />
              <div>
                <p className="text-2xl font-bold text-[#b29032]">{collectionRate}%</p>
                <p className="text-sm text-gray-600">Collection Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payments.slice(0, 3).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between rounded bg-gray-50 p-2">
                      <div>
                        <p className="text-sm font-medium">{payment.studentName}</p>
                        <p className="text-xs text-gray-600">
                          {formatCurrency(payment.amount)} • {payment.typeLabel}
                        </p>
                      </div>
                      <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>{payment.status}</Badge>
                    </div>
                  ))}
                  {payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-[#2d682d]">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Online Payments</span>
                    <span className="text-sm font-bold text-[#2d682d]">{onlinePaymentCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Offline Payments</span>
                    <span className="text-sm font-bold text-[#b29032]">{offlinePaymentCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Payment Management</CardTitle>
              <CardDescription>Track and manage all student payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Search payments..."
                      className="pl-8"
                      value={paymentSearch}
                      onChange={(event) => setPaymentSearch(event.target.value)}
                    />
                  </div>
                  <Button className="bg-[#b29032] hover:bg-[#b29032]/90" onClick={() => setShowPaymentDialog(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </div>

                <div className="space-y-2">
                  {filteredPayments.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                      No payments match your search.
                    </p>
                  ) : (
                    filteredPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex-1">
                          <h3 className="font-medium">{payment.studentName}</h3>
                          <p className="text-sm text-gray-600">
                            {payment.studentClass} • {payment.typeLabel}
                          </p>
                          <p className="text-xs text-gray-500">
                            Date: {formatDate(payment.date)} • Ref: {payment.reference}
                          </p>
                        </div>
                        <div className="mr-4 text-center">
                          <p className="text-lg font-bold text-[#2d682d]">{formatCurrency(payment.amount)}</p>
                          <p className="text-xs text-gray-500">{payment.methodLabel}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={PAYMENT_STATUS_BADGE[payment.status]}>{payment.status}</Badge>
                          {payment.status === "paid" && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(payment)}>
                                <Download className="mr-1 h-4 w-4" />
                                Download
                              </Button>
                              <Button
                                size="sm"
                                className="bg-[#2d682d] hover:bg-[#2d682d]/90"
                                onClick={() => handlePrintReceipt(payment)}
                              >
                                <Printer className="mr-1 h-4 w-4" />
                                Print
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Receipt Management</CardTitle>
              <CardDescription>Generate, print, and download payment receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {receipts.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Receipts will appear here once issued.
                  </p>
                ) : (
                  receipts.map((receipt) => (
                    <div key={receipt.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div className="flex-1">
                        <h3 className="font-medium">Receipt {receipt.reference}</h3>
                        <p className="text-sm text-gray-600">{receipt.studentName}</p>
                        <p className="text-xs text-gray-500">
                          Date: {formatDate(receipt.issuedDate)} • Ref: {receipt.reference}
                        </p>
                      </div>
                      <div className="mr-4 text-center">
                        <p className="text-lg font-bold text-[#2d682d]">{receipt.amountLabel}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleDownloadReceipt(receipt)}>
                          <Download className="mr-1 h-4 w-4" />
                          Download
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#2d682d] hover:bg-[#2d682d]/90"
                          onClick={() => handlePrintReceipt(receipt)}
                        >
                          <Printer className="mr-1 h-4 w-4" />
                          Print
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fees" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-[#2d682d]">Fee Structure Management</CardTitle>
                  <CardDescription>Update and manage school fee structure by class</CardDescription>
                </div>
                <Button className="bg-[#b29032] hover:bg-[#b29032]/90" onClick={() => setShowFeeDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Update Fee Structure
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 text-sm">
                    <thead>
                      <tr className="bg-[#2d682d] text-white">
                        <th className="border border-gray-300 p-2 text-left">Class</th>
                        <th className="border border-gray-300 p-2 text-right">Tuition</th>
                        <th className="border border-gray-300 p-2 text-right">Development</th>
                        <th className="border border-gray-300 p-2 text-right">Exam</th>
                        <th className="border border-gray-300 p-2 text-right">Sports</th>
                        <th className="border border-gray-300 p-2 text-right">Library</th>
                        <th className="border border-gray-300 p-2 text-right">Total</th>
                        <th className="border border-gray-300 p-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeStructure.map((fee) => (
                        <tr key={fee.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-2 font-medium">{fee.class}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(fee.tuition)}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(fee.development)}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(fee.exam)}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(fee.sports)}</td>
                          <td className="border border-gray-300 p-2 text-right">{formatCurrency(fee.library)}</td>
                          <td className="border border-gray-300 p-2 text-right font-bold text-[#2d682d]">
                            {formatCurrency(fee.total)}
                          </td>
                          <td className="border border-gray-300 p-2 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFeeForm({
                                  id: fee.id,
                                  class: fee.class,
                                  tuition: fee.tuition,
                                  development: fee.development,
                                  exam: fee.exam,
                                  sports: fee.sports,
                                  library: fee.library,
                                })
                                setShowFeeDialog(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {feeStructure.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-sm text-muted-foreground">
                            No fee structures have been configured yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-[#2d682d]">Financial Reports &amp; Analytics</CardTitle>
              <CardDescription>Generate comprehensive financial reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {REPORT_BUTTONS.map((report) => {
                  const isGenerating = generatingReport === report.type
                  return (
                    <Button
                      key={report.type}
                      className={`${report.className} flex h-20 flex-col items-center justify-center gap-2 text-center`}
                      disabled={isGenerating}
                      onClick={() => handleGenerateReport(report.type)}
                    >
                      {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                      {report.label}
                    </Button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{feeForm.id ? "Edit Fee Structure" : "Create Fee Structure"}</DialogTitle>
            <DialogDescription>Set fee amounts for each category</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fee-class">Class</Label>
              <Select
                value={feeForm.class}
                onValueChange={(value) => setFeeForm((prev) => ({ ...prev, class: value }))}
              >
                <SelectTrigger id="fee-class">
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Or type a class name"
                value={feeForm.class}
                onChange={(event) => setFeeForm((prev) => ({ ...prev, class: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tuition">Tuition (₦)</Label>
                <Input
                  id="tuition"
                  inputMode="numeric"
                  value={feeForm.tuition}
                  onChange={(event) => setFeeForm((prev) => ({ ...prev, tuition: Number(event.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="development">Development (₦)</Label>
                <Input
                  id="development"
                  inputMode="numeric"
                  value={feeForm.development}
                  onChange={(event) =>
                    setFeeForm((prev) => ({ ...prev, development: Number(event.target.value) || 0 }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="exam">Exam (₦)</Label>
                <Input
                  id="exam"
                  inputMode="numeric"
                  value={feeForm.exam}
                  onChange={(event) => setFeeForm((prev) => ({ ...prev, exam: Number(event.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="sports">Sports (₦)</Label>
                <Input
                  id="sports"
                  inputMode="numeric"
                  value={feeForm.sports}
                  onChange={(event) => setFeeForm((prev) => ({ ...prev, sports: Number(event.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="library">Library (₦)</Label>
                <Input
                  id="library"
                  inputMode="numeric"
                  value={feeForm.library}
                  onChange={(event) => setFeeForm((prev) => ({ ...prev, library: Number(event.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Total</Label>
                <div className="rounded bg-gray-100 p-2 font-bold text-[#2d682d]">
                  {formatCurrency(
                    feeForm.tuition + feeForm.development + feeForm.exam + feeForm.sports + feeForm.library,
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2d682d] hover:bg-[#2d682d]/90"
              onClick={handleUpdateFeeStructure}
              disabled={isSavingFee}
            >
              {isSavingFee && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Fee Structure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Log a payment and optionally generate a receipt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payment-student">Student</Label>
              <Select
                value={paymentForm.studentId}
                onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, studentId: value }))}
              >
                <SelectTrigger id="payment-student">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name} • {student.class}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount (₦)</Label>
                <Input
                  id="payment-amount"
                  inputMode="numeric"
                  value={paymentForm.amount}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Method</Label>
                <Select
                  value={paymentForm.method}
                  onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, method: value as PaymentMethod }))}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online Portal</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-status">Status</Label>
                <Select
                  value={paymentForm.status}
                  onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, status: value as PaymentStatus }))}
                >
                  <SelectTrigger id="payment-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-term">Term</Label>
                <Input
                  id="payment-term"
                  value={paymentForm.term}
                  onChange={(event) => setPaymentForm((prev) => ({ ...prev, term: event.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-description">Description</Label>
              <Textarea
                id="payment-description"
                value={paymentForm.description}
                onChange={(event) => setPaymentForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="generate-receipt"
                checked={paymentForm.generateReceipt}
                onCheckedChange={(checked) =>
                  setPaymentForm((prev) => ({ ...prev, generateReceipt: checked === true }))
                }
              />
              <Label htmlFor="generate-receipt" className="text-sm font-medium leading-none">
                Generate receipt automatically
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2d682d] hover:bg-[#2d682d]/90"
              onClick={handleRecordPayment}
              disabled={isSavingPayment}
            >
              {isSavingPayment && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Print Receipt</DialogTitle>
            <DialogDescription>Receipt for {selectedRecord?.studentName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 rounded-lg border bg-gray-50 p-4 text-sm">
            <div className="text-center">
              <h3 className="font-bold text-[#2d682d]">VICTORY EDUCATIONAL ACADEMY</h3>
              <p className="text-xs text-gray-600">Official Payment Receipt</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Student:</span>
                <span className="font-medium">{selectedRecord?.studentName ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount:</span>
                <span className="font-medium">{selectedRecord ? formatCurrency(selectedRecord.amount) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Reference:</span>
                <span className="font-medium">{selectedRecord?.reference ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span className="font-medium">{selectedRecord ? formatDate(selectedRecord.date) : "—"}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>
              Close
            </Button>
            <Button
              className="bg-[#2d682d] hover:bg-[#2d682d]/90"
              onClick={() => {
                console.log("Printing receipt for:", selectedRecord)
                setShowReceiptDialog(false)
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
