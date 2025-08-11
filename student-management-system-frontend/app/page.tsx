"use client";

import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { StudentGrid } from "@/components/student-grid";
import { QRScanner } from "@/components/qr-scanner";
import { StudentForm } from "@/components/student-form";
import { ExportManager } from "@/components/export-manager";
import { Settings } from "@/components/settings";
import { PaymentReminders } from "@/components/payment-reminders";
import { AttendanceView } from "@/components/attendance-view";
import { DashboardStats } from "@/components/dashboard-stats";
import { AppSidebar } from "@/components/app-sidebar";
import { QRCodeManager } from "@/components/qr-code-manager";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ApiService } from "@/lib/api";
import {
  transformStudentsForUI,
  transformSettingsForUI,
  getPaymentStatusText,
  normalizeStudentData,
} from "@/lib/data-transform";
import type { Student, AppSettings } from "@/types";

const defaultSettings: AppSettings = {
  payment_threshold: 6000,
  default_groups: ["المجموعة الأولى", "المجموعة الثانية", "المجموعة الثالثة"],
  enable_audit_log: true,
  language: "ar",
  theme: "light",
  enable_multi_user: false,
  backup_encryption: false,
  accessibility_mode: false,
  reminder_days: 7,
};

// Centralized error message handling
function getErrorMessage(err: unknown, operation: string): string {
  if (err instanceof Error) {
    // Map common backend errors to Arabic messages
    const errorMappings: Record<string, string> = {
      "Group name is required": "المجموعة مطلوبة",
      "Student name is required": "اسم الطالب مطلوب",
      "Plan amount must be positive": "مبلغ الخطة يجب أن يكون أكبر من صفر",
      "Student with ID": "الطالب غير موجود",
      "Failed to execute": "فشل في تنفيذ العملية",
    };

    for (const [key, value] of Object.entries(errorMappings)) {
      if (err.message.includes(key)) {
        return value;
      }
    }

    // Return the original error message if no mapping found
    return `خطأ: ${err.message}`;
  }

  // Fallback for unknown error types
  const operationNames: Record<string, string> = {
    add_student: "إضافة الطالب",
    update_student: "تحديث الطالب",
    delete_student: "حذف الطالب",
    load_data: "تحميل البيانات",
  };

  return `فشل في ${operationNames[operation] || operation}`;
}

export default function StudentManagementSystem() {
  const [students, setStudents] = useState<Student[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [activeView, setActiveView] = useState("dashboard");
  const [isStudentFormOpen, setIsStudentFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [scanResult, setScanResult] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load data from backend on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize default data first
      await Promise.all([
        ApiService.ensureDefaultGroupsExist().catch(console.error),
        ApiService.ensurePaymentSettingsExist().catch(console.error),
      ]);

      // Load students and settings in parallel
      const [studentsData, settingsData] = await Promise.all([
        ApiService.getAllStudents(),
        ApiService.getSettings().catch(() => defaultSettings), // Fallback to defaults if settings fail
      ]);

      setStudents(transformStudentsForUI(studentsData));
      setSettings(transformSettingsForUI(settingsData));
    } catch (err) {
      console.error("Failed to load initial data:", err);
      setError("فشل في تحميل البيانات. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStudents = async () => {
    try {
      const studentsData = await ApiService.getAllStudents();
      setStudents(transformStudentsForUI(studentsData));
    } catch (err) {
      console.error("Failed to refresh students:", err);
      setError("فشل في تحديث قائمة الطلاب");
    }
  };

  const handleStudentScan = async (studentId: string) => {
    if (!studentId?.trim()) {
      setScanResult("رقم الطالب غير صحيح");
      return;
    }

    try {
      // Check if student exists
      const student = await ApiService.getStudentById(studentId.trim());
      if (!student) {
        setScanResult("رقم الطالب غير موجود");
        return;
      }

      // Check if already marked attendance today
      const alreadyMarked = await ApiService.checkAttendanceToday(
        studentId.trim()
      );
      if (alreadyMarked) {
        setScanResult(`${student.name} - تم تسجيل الحضور مسبقاً اليوم`);
        return;
      }

      // Mark attendance
      await ApiService.markAttendance(studentId.trim());
      setScanResult(
        `تم تسجيل حضور ${student.name} - حالة الدفع: ${getPaymentStatusText(
          student.payment_status || student.paymentStatus || "pending"
        )}`
      );

      // Refresh students list to update attendance count
      await refreshStudents();
    } catch (err) {
      console.error("Failed to scan student:", err);
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setScanResult(`خطأ في تسجيل الحضور: ${errorMessage}`);
    }
  };

  const handleAddStudent = async (
    studentData: Omit<
      Student,
      "id" | "attendanceLog" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ) => {
    try {
      console.log("Adding student with data:", studentData);

      // Normalize data to consistent format and validate
      const normalizedData = normalizeStudentData(studentData);

      if (!normalizedData.name.trim()) {
        throw new Error("اسم الطالب مطلوب");
      }

      if (!normalizedData.group_name.trim()) {
        throw new Error("المجموعة مطلوبة");
      }

      console.log("Sending normalized data to API:", normalizedData);

      const result = await ApiService.addStudent(
        normalizedData.name,
        normalizedData.group_name,
        normalizedData.payment_plan,
        normalizedData.plan_amount,
        normalizedData.installment_count,
        normalizedData.paid_amount,
        normalizedData.enrollment_date
      );

      console.log("Student added successfully:", result);

      // Refresh students list
      await refreshStudents();
      setIsStudentFormOpen(false);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Failed to add student:", err);

      const errorMessage = getErrorMessage(err, "add_student");
      setError(errorMessage);
    }
  };

  const handleUpdateStudent = async (updatedStudent: Student) => {
    try {
      setIsLoading(true);
      console.log("Updating student with data:", updatedStudent);

      // Normalize data to consistent format
      const normalizedData = normalizeStudentData(updatedStudent);

      await ApiService.updateStudent(
        updatedStudent.id,
        normalizedData.name,
        normalizedData.group_name,
        normalizedData.payment_plan,
        normalizedData.plan_amount,
        normalizedData.installment_count,
        normalizedData.paid_amount,
        normalizedData.enrollment_date
      );

      // Refresh students list
      await refreshStudents();
      setEditingStudent(null);
      setIsStudentFormOpen(false);
      setError(null); // Clear any previous errors
    } catch (err) {
      console.error("Failed to update student:", err);
      const errorMessage = getErrorMessage(err, "update_student");
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الطالب "${student.name}"؟\n\nسيتم حذف جميع بيانات الطالب بما في ذلك سجل الحضور وتاريخ المدفوعات. هذا الإجراء لا يمكن التراجع عنه.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await ApiService.deleteStudent(student.id);

      // Refresh students list
      await refreshStudents();

      // Show success toast
      toast({
        title: "تم الحذف بنجاح",
        description: `تم حذف الطالب "${student.name}" بنجاح`,
        variant: "default",
      });
    } catch (err) {
      console.error("Failed to delete student:", err);

      // Show error toast
      toast({
        title: "خطأ في الحذف",
        description: `فشل في حذف الطالب "${student.name}". يرجى المحاولة مرة أخرى.`,
        variant: "destructive",
      });
    }
  };

  const renderMainContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <DashboardStats students={students} />
            <QRScanner onScan={handleStudentScan} result={scanResult} />
          </div>
        );
      case "students":
        return (
          <StudentGrid
            students={students}
            onEditStudent={(student) => {
              setEditingStudent(student);
              setIsStudentFormOpen(true);
            }}
            onDeleteStudent={handleDeleteStudent}
            onAddStudent={() => setIsStudentFormOpen(true)}
          />
        );
      case "attendance":
        return <AttendanceView students={students} />;
      case "payments":
        return <PaymentReminders students={students} />;
      case "reports":
        return <ExportManager students={students} />;
      case "settings":
        return (
          <Settings
            settings={settings}
            onUpdateSettings={async (newSettings) => {
              try {
                await ApiService.updateSettings(newSettings);
                setSettings(newSettings);
              } catch (err) {
                console.error("Failed to update settings:", err);
                setError("فشل في حفظ الإعدادات");
              }
            }}
          />
        );
      case "qr-codes":
        return <QRCodeManager />;
      default:
        return (
          <div className="space-y-6">
            <DashboardStats students={students} />
            <QRScanner onScan={handleStudentScan} result={scanResult} />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <SidebarProvider defaultOpen={true}>
        <AppSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          students={students}
        />
        <SidebarInset>
          <div className="flex-1 space-y-4 p-4 md:p-8">
            <div className="bg-background border-b">
              <div className="flex h-14 items-center gap-4 px-4">
                <SidebarTrigger className="h-8 w-8 border border-border hover:bg-accent" />
                <div className="flex items-center gap-2">
                  <h1 className="font-semibold">نظام إدارة الطلاب</h1>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="mr-3">
                    <h3 className="text-sm font-medium text-red-800">خطأ</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        className="bg-red-100 px-2 py-1 text-sm font-medium text-red-800 rounded-md hover:bg-red-200"
                        onClick={() => setError(null)}
                      >
                        إغلاق
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">{renderMainContent()}</div>
          </div>
        </SidebarInset>

        {/* Student Form Modal */}
        {isStudentFormOpen && (
          <StudentForm
            student={editingStudent}
            settings={settings}
            onSubmit={(studentData) => {
              if (editingStudent) {
                // For updates, we need the full Student object
                handleUpdateStudent(studentData as Student);
              } else {
                // For new students, we have the partial data
                handleAddStudent(
                  studentData as Omit<
                    Student,
                    | "id"
                    | "attendanceLog"
                    | "paymentHistory"
                    | "createdAt"
                    | "updatedAt"
                  >
                );
              }
            }}
            onClose={() => {
              setIsStudentFormOpen(false);
              setEditingStudent(null);
            }}
          />
        )}
      </SidebarProvider>
    </div>
  );
}
