"use client";

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
import { KeyboardNavigationProvider } from "@/components/keyboard-navigation-provider";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { SkipNavigation } from "@/components/skip-navigation";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { DebugStudentUpdate } from "@/components/debug-student-update";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAppState } from "@/hooks/useAppState";
import { useStudentOperations } from "@/hooks/useStudentOperations";
import type { Student } from "@/types";

export default function StudentManagementSystem() {
  const [state, actions] = useAppState();

  const studentOperations = useStudentOperations(
    () => {
      actions.refreshStudents();
      actions.closeStudentForm();
    },
    (error) => actions.setScanResult(error)
  );

  // Wrapper function to handle both Student and partial Student data
  const handleStudentFormSubmit = (
    student:
      | Student
      | Omit<
      Student,
      "id" | "attendanceLog" | "paymentHistory" | "createdAt" | "updatedAt"
    >
  ) => {
    if (state.editingStudent) {
      // For updates, we need the full Student object
      studentOperations.updateStudent(student as Student);
    } else {
      // For new students, we have the partial data
      studentOperations.addStudent(
        student as Omit<
          Student,
          "id" | "attendanceLog" | "paymentHistory" | "createdAt" | "updatedAt"
        >
      );
    }
  };

  const renderMainContent = () => {
    switch (state.activeView) {
      case "dashboard":
        return <DashboardStats students={state.students} />;
      case "students":
        return (
          <StudentGrid
            students={state.students}
            onEditStudent={actions.openStudentForm}
            onDeleteStudent={studentOperations.deleteStudent}
            onAddStudent={() => actions.openStudentForm()}
          />
        );
      case "attendance":
        return <AttendanceView students={state.students} />;
      case "payments":
        return <PaymentReminders students={state.students} />;
      case "reports":
        return <ExportManager students={state.students} />;
      case "settings":
        return (
          <Settings
            settings={state.settings}
            onUpdateSettings={async (newSettings) => {
              // Update settings logic would go here
              console.log("Settings updated:", newSettings);
            }}
          />
        );
      case "qr-codes":
        return <QRCodeManager />;
      case "debug":
        return <DebugStudentUpdate />;
      default:
        return <DashboardStats students={state.students} />;
    }
  };

  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md mx-auto p-6 bg-destructive/10 rounded-lg border border-destructive/20">
          <h2 className="text-xl font-semibold text-destructive mb-2">
            خطأ في التطبيق
          </h2>
          <p className="text-destructive/80 mb-4">{state.error}</p>
          <button
            onClick={actions.clearError}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  return (
    <KeyboardNavigationProvider>
    <AccessibilityProvider>
        <SidebarProvider>
          <div className="flex h-screen bg-background">
            <AppSidebar
              activeView={state.activeView}
              onViewChange={actions.setActiveView}
              students={state.students}
            />

            <SidebarInset className="flex-1 flex flex-col">
              <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-16 items-center gap-4 px-4">
                  <SidebarTrigger className="-ml-1" />
                  <div className="flex-1" />
                      <HighContrastToggle />
                  <SkipNavigation />
                  </div>
                </header>

              <main className="flex-1 overflow-auto p-6">
                  {renderMainContent()}
                </main>
            </SidebarInset>
          </div>

          {state.isStudentFormOpen && (
              <StudentForm
              student={state.editingStudent}
              onClose={actions.closeStudentForm}
              onSubmit={handleStudentFormSubmit}
            />
          )}

          <QRScanner
            onScan={studentOperations.handleStudentScan}
            result={state.scanResult}
          />
          </SidebarProvider>
      </AccessibilityProvider>
      </KeyboardNavigationProvider>
  );
}
