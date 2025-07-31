"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Download,
  FileText,
  Users,
  Calendar,
  QrCode,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import type { Student } from "@/types";

interface ExportManagerProps {
  students: Student[];
}

export function ExportManager({ students }: ExportManagerProps) {
  const [exportStatus, setExportStatus] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const generateCSV = (data: any[], filename: string) => {
    // Convert data to CSV format
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    // Create and download file
    const blob = new Blob(["\ufeff" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAttendanceReport = async () => {
    setIsExporting(true);
    setExportStatus("");

    try {
      // Simulate attendance data
      const attendanceData = students.map((student) => ({
        "رقم الطالب": student.id,
        "اسم الطالب": student.name,
        المجموعة: student.group,
        "إجمالي الحضور": Math.floor(Math.random() * 20) + 5, // Mock data
        "نسبة الحضور": `${Math.floor(Math.random() * 30) + 70}%`,
        "آخر حضور": new Date().toLocaleDateString("ar-EG"),
      }));

      generateCSV(
        attendanceData,
        `attendance-report-${new Date().toISOString().split("T")[0]}.csv`
      );
      setExportStatus("تم تصدير تقرير الحضور بنجاح");
    } catch (error) {
      setExportStatus("حدث خطأ أثناء تصدير تقرير الحضور");
    } finally {
      setIsExporting(false);
    }
  };

  const exportPaymentSummary = async () => {
    setIsExporting(true);
    setExportStatus("");

    try {
      const paymentData = students.map((student) => ({
        "رقم الطالب": student.id,
        "اسم الطالب": student.name,
        المجموعة: student.group_name || student.group || "",
        "خطة الدفع": (() => {
          const plan =
            student.payment_plan || student.paymentPlan || "one-time";
          return plan === "one-time"
            ? "دفعة واحدة"
            : plan === "monthly"
            ? "شهري"
            : "أقساط";
        })(),
        "المبلغ المطلوب": (() => {
          const plan =
            student.payment_plan || student.paymentPlan || "one-time";
          const planAmount = student.plan_amount || student.planAmount || 0;
          const installmentCount =
            student.installment_count || student.installmentCount || 3;
          return plan === "installment"
            ? (planAmount * installmentCount).toLocaleString()
            : planAmount.toLocaleString();
        })(),
        "المبلغ المدفوع": (
          student.paid_amount ||
          student.paidAmount ||
          0
        ).toLocaleString(),
        "المبلغ المتبقي": (() => {
          const plan =
            student.payment_plan || student.paymentPlan || "one-time";
          const planAmount = student.plan_amount || student.planAmount || 0;
          const paidAmount = student.paid_amount || student.paidAmount || 0;
          const installmentCount =
            student.installment_count || student.installmentCount || 3;
          const totalRequired =
            plan === "installment" ? planAmount * installmentCount : planAmount;
          return (totalRequired - paidAmount).toLocaleString();
        })(),
        "حالة الدفع": (() => {
          const status =
            student.payment_status || student.paymentStatus || "pending";
          return status === "paid"
            ? "مدفوع"
            : status === "pending"
            ? "في الانتظار"
            : status === "overdue"
            ? "متأخر"
            : "مستحق قريباً";
        })(),
        "تاريخ الاستحقاق": (() => {
          const dueDate = student.next_due_date || student.nextDueDate;
          return dueDate ? new Date(dueDate).toLocaleDateString("ar-EG") : "-";
        })(),
      }));

      generateCSV(
        paymentData,
        `payment-summary-${new Date().toISOString().split("T")[0]}.csv`
      );
      setExportStatus("تم تصدير ملخص المدفوعات بنجاح");
    } catch (error) {
      setExportStatus("حدث خطأ أثناء تصدير ملخص المدفوعات");
    } finally {
      setIsExporting(false);
    }
  };

  const exportStudentList = async () => {
    setIsExporting(true);
    setExportStatus("");

    try {
      const studentData = students.map((student) => ({
        "رقم الطالب": student.id,
        "اسم الطالب": student.name,
        المجموعة: student.group_name || student.group || "",
        "خطة الدفع": (() => {
          const plan =
            student.payment_plan || student.paymentPlan || "one-time";
          return plan === "one-time"
            ? "دفعة واحدة"
            : plan === "monthly"
            ? "شهري"
            : "أقساط";
        })(),
        "تاريخ التسجيل": new Date(
          student.enrollment_date || student.enrollmentDate || new Date()
        ).toLocaleDateString("ar-EG"),
        "المبلغ المدفوع": (
          student.paid_amount ||
          student.paidAmount ||
          0
        ).toLocaleString(),
        "حالة الدفع": (() => {
          const status =
            student.payment_status || student.paymentStatus || "pending";
          return status === "paid"
            ? "مدفوع"
            : status === "pending"
            ? "في الانتظار"
            : status === "overdue"
            ? "متأخر"
            : "مستحق قريباً";
        })(),
      }));

      generateCSV(
        studentData,
        `student-list-${new Date().toISOString().split("T")[0]}.csv`
      );
      setExportStatus("تم تصدير قائمة الطلاب بنجاح");
    } catch (error) {
      setExportStatus("حدث خطأ أثناء تصدير قائمة الطلاب");
    } finally {
      setIsExporting(false);
    }
  };

  const exportQRCodes = async () => {
    setIsExporting(true);
    setExportStatus("");

    try {
      // In a real implementation, this would generate a PDF with QR codes
      // For now, we'll export a CSV with student IDs for QR code generation
      const qrData = students.map((student) => ({
        "رقم الطالب": student.id,
        "اسم الطالب": student.name,
        المجموعة: student.group,
        "QR Code Data": student.id, // This would be used to generate QR codes
      }));

      generateCSV(
        qrData,
        `qr-codes-data-${new Date().toISOString().split("T")[0]}.csv`
      );
      setExportStatus("تم تصدير بيانات رموز QR بنجاح");
    } catch (error) {
      setExportStatus("حدث خطأ أثناء تصدير بيانات رموز QR");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تصدير التقارير
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={exportAttendanceReport}
              disabled={isExporting}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <Calendar className="h-6 w-6" />
              <span>تقرير الحضور</span>
            </Button>

            <Button
              onClick={exportPaymentSummary}
              disabled={isExporting}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <Download className="h-6 w-6" />
              <span>ملخص المدفوعات</span>
            </Button>

            <Button
              onClick={exportStudentList}
              disabled={isExporting}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <Users className="h-6 w-6" />
              <span>قائمة الطلاب</span>
            </Button>

            <Button
              onClick={exportQRCodes}
              disabled={isExporting}
              className="h-20 flex-col gap-2 bg-transparent"
              variant="outline"
            >
              <QrCode className="h-6 w-6" />
              <span>رموز QR</span>
            </Button>
          </div>

          {exportStatus && (
            <Alert
              className={
                exportStatus.includes("بنجاح")
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }
            >
              {exportStatus.includes("بنجاح") ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription
                className={
                  exportStatus.includes("بنجاح")
                    ? "text-green-800"
                    : "text-red-800"
                }
              >
                {exportStatus}
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-gray-600 space-y-1">
            <p>• جميع الملفات المصدرة بصيغة CSV مع دعم النصوص العربية</p>
            <p>• يتم حفظ الملفات في مجلد التحميلات الافتراضي</p>
            <p>• أسماء الملفات تتضمن التاريخ الحالي</p>
          </div>
        </CardContent>
      </Card>

      {/* Export Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>إحصائيات التصدير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {students.length}
              </div>
              <div className="text-sm text-gray-600">إجمالي الطلاب</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {students.filter((s) => s.paymentStatus === "paid").length}
              </div>
              <div className="text-sm text-gray-600">طلاب مدفوعين</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {students.filter((s) => s.paymentStatus === "overdue").length}
              </div>
              <div className="text-sm text-gray-600">مدفوعات متأخرة</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(students.map((s) => s.group)).size}
              </div>
              <div className="text-sm text-gray-600">المجموعات</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
