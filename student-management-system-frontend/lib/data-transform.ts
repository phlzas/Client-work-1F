import type {
  Student,
  AttendanceRecord,
  PaymentTransaction,
  AppSettings,
  StudentFormData,
} from "@/types";

/**
 * Utility functions to transform data between backend format (snake_case)
 * and frontend format (camelCase) for UI compatibility
 */

export function transformStudentForUI(student: Student): Student {
  if (!student) {
    throw new Error("Student data is required for transformation");
  }

  return {
    ...student,
    // Add camelCase aliases for UI compatibility
    group: student.group_name || "",
    paymentPlan: student.payment_plan || "one-time",
    planAmount: student.plan_amount || 0,
    installmentCount: student.installment_count,
    paidAmount: student.paid_amount || 0,
    enrollmentDate: student.enrollment_date || "",
    nextDueDate: student.next_due_date,
    paymentStatus: student.payment_status || "pending",
    attendanceLog: student.attendance_log?.map(transformAttendanceForUI) || [],
    paymentHistory: student.payment_history?.map(transformPaymentForUI) || [],
    createdAt: student.created_at || "",
    updatedAt: student.updated_at || "",
  };
}

export function transformStudentsForUI(students: Student[]): Student[] {
  return students.map(transformStudentForUI);
}

export function transformAttendanceForUI(
  attendance: AttendanceRecord
): AttendanceRecord {
  return {
    ...attendance,
    // Add camelCase aliases for UI compatibility
    studentId: attendance.student_id,
    createdAt: attendance.created_at,
  };
}

export function transformAttendanceListForUI(
  attendanceList: AttendanceRecord[]
): AttendanceRecord[] {
  return attendanceList.map(transformAttendanceForUI);
}

export function transformPaymentForUI(
  payment: PaymentTransaction
): PaymentTransaction {
  return {
    ...payment,
    // Add camelCase aliases for UI compatibility
    studentId: payment.student_id,
    paymentDate: payment.payment_date,
    paymentMethod: payment.payment_method,
    createdAt: payment.created_at,
  };
}

export function transformPaymentListForUI(
  payments: PaymentTransaction[]
): PaymentTransaction[] {
  return payments.map(transformPaymentForUI);
}

export function transformSettingsForUI(settings: AppSettings): AppSettings {
  return {
    ...settings,
    // Add camelCase aliases for UI compatibility
    paymentThreshold: settings.payment_threshold,
    defaultGroups: settings.default_groups,
    enableAuditLog: settings.enable_audit_log,
    enableMultiUser: settings.enable_multi_user,
    backupEncryption: settings.backup_encryption,
    accessibilityMode: settings.accessibility_mode,
  };
}

// Helper functions for creating new records with proper backend format
export function createStudentForBackend(studentData: {
  name: string;
  group: string;
  paymentPlan: "one-time" | "monthly" | "installment";
  planAmount: number;
  installmentCount?: number;
  paidAmount: number;
  enrollmentDate: string;
  paymentStatus: "paid" | "pending" | "overdue" | "due_soon";
}): Omit<
  Student,
  | "id"
  | "attendance_log"
  | "payment_history"
  | "created_at"
  | "updated_at"
  | "next_due_date"
> {
  return {
    name: studentData.name,
    group_name: studentData.group,
    payment_plan: studentData.paymentPlan,
    plan_amount: studentData.planAmount,
    installment_count: studentData.installmentCount,
    paid_amount: studentData.paidAmount,
    enrollment_date: studentData.enrollmentDate,
    payment_status: studentData.paymentStatus,
  };
}

// Normalize mixed format data to consistent backend format
export function normalizeStudentData(data: any): StudentFormData {
  return {
    name: data.name || "",
    group_name: data.group_name || data.group || "",
    payment_plan: data.payment_plan || data.paymentPlan || "one-time",
    plan_amount: data.plan_amount ?? data.planAmount ?? 0,
    installment_count: data.installment_count || data.installmentCount,
    paid_amount: data.paid_amount ?? data.paidAmount ?? 0,
    enrollment_date:
      data.enrollment_date ||
      data.enrollmentDate ||
      new Date().toISOString().split("T")[0],
    payment_status: data.payment_status || data.paymentStatus || "pending",
    next_due_date: data.next_due_date || data.nextDueDate,
  };
}

export function createSettingsForBackend(settingsData: {
  paymentThreshold: number;
  defaultGroups: string[];
  enableAuditLog: boolean;
  language: "en" | "ar";
  theme: "light" | "dark";
  enableMultiUser: boolean;
  backupEncryption: boolean;
  accessibilityMode: boolean;
  reminderDays?: number;
}): AppSettings {
  return {
    payment_threshold: settingsData.paymentThreshold,
    default_groups: settingsData.defaultGroups,
    enable_audit_log: settingsData.enableAuditLog,
    language: settingsData.language,
    theme: settingsData.theme,
    enable_multi_user: settingsData.enableMultiUser,
    backup_encryption: settingsData.backupEncryption,
    accessibility_mode: settingsData.accessibilityMode,
    reminder_days: settingsData.reminderDays || 7,
  };
}

// Validation helpers
export function validateStudentData(student: Partial<Student>): string[] {
  const errors: string[] = [];

  if (!student.name?.trim()) {
    errors.push("اسم الطالب مطلوب");
  }

  if (!student.group_name?.trim() && !student.group?.trim()) {
    errors.push("المجموعة مطلوبة");
  }

  const planAmount = student.plan_amount || student.planAmount;
  if (!planAmount || planAmount <= 0) {
    errors.push("مبلغ الخطة يجب أن يكون أكبر من صفر");
  }

  const paidAmount = student.paid_amount || student.paidAmount;
  if (paidAmount !== undefined && paidAmount < 0) {
    errors.push("المبلغ المدفوع لا يمكن أن يكون سالباً");
  }

  const paymentPlan = student.payment_plan || student.paymentPlan;
  const installmentCount =
    student.installment_count || student.installmentCount;
  if (
    paymentPlan === "installment" &&
    (!installmentCount || installmentCount <= 0)
  ) {
    errors.push("عدد الأقساط مطلوب للخطط المقسطة");
  }

  return errors;
}

export function validatePaymentData(payment: {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
}): string[] {
  const errors: string[] = [];

  if (!payment.amount || payment.amount <= 0) {
    errors.push("مبلغ الدفع يجب أن يكون أكبر من صفر");
  }

  if (!payment.paymentDate) {
    errors.push("تاريخ الدفع مطلوب");
  }

  if (!payment.paymentMethod) {
    errors.push("طريقة الدفع مطلوبة");
  }

  return errors;
}

// Date formatting helpers
export function formatDateForDisplay(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateForInput(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  } catch {
    return dateString;
  }
}

// Currency formatting
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("ar-EG")} ج.م`;
}

// Payment status helpers
export function getPaymentStatusText(status: string): string {
  switch (status) {
    case "paid":
      return "مدفوع";
    case "pending":
      return "في الانتظار";
    case "overdue":
      return "متأخر";
    case "due_soon":
      return "مستحق قريباً";
    default:
      return status;
  }
}

export function getPaymentStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "overdue":
      return "bg-red-100 text-red-800 border-red-200";
    case "due_soon":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getPaymentPlanText(plan: string): string {
  switch (plan) {
    case "one-time":
      return "دفعة واحدة";
    case "monthly":
      return "شهري";
    case "installment":
      return "أقساط";
    default:
      return plan;
  }
}

export function getPaymentMethodText(method: string): string {
  switch (method) {
    case "cash":
      return "نقداً";
    case "bank_transfer":
      return "تحويل بنكي";
    case "check":
      return "شيك";
    default:
      return method;
  }
}
