// Payment plan types with better discrimination
export type PaymentPlan = "one-time" | "monthly" | "installment";
export type PaymentStatus = "paid" | "pending" | "overdue" | "due_soon";

// Base student interface (backend format)
export interface StudentBase {
  id: string;
  name: string;
  group_name: string;
  payment_plan: PaymentPlan;
  plan_amount: number;
  installment_count?: number;
  paid_amount: number;
  enrollment_date: string;
  next_due_date?: string | null;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

// Extended student with optional relations
export interface Student extends StudentBase {
  attendance_log?: AttendanceRecord[];
  payment_history?: PaymentTransaction[];

  // UI compatibility aliases (computed properties)
  group?: string;
  paymentPlan?: PaymentPlan;
  planAmount?: number;
  installmentCount?: number;
  paidAmount?: number;
  enrollmentDate?: string;
  nextDueDate?: string | null;
  paymentStatus?: PaymentStatus;
  attendanceLog?: AttendanceRecord[];
  paymentHistory?: PaymentTransaction[];
  createdAt?: string;
  updatedAt?: string;
}

// Form data type for student creation/editing
export interface StudentFormData {
  name: string;
  group_name: string;
  payment_plan: PaymentPlan;
  plan_amount: number;
  installment_count?: number;
  paid_amount: number;
  enrollment_date: string;
  payment_status: PaymentStatus;
  next_due_date?: string | null;
}

export interface AttendanceRecord {
  id: number;
  student_id: string; // Backend uses snake_case
  date: string;
  created_at: string; // Backend uses snake_case

  // UI compatibility aliases
  studentId?: string; // Alias for student_id
  createdAt?: string; // Alias for created_at
}

export interface PaymentTransaction {
  id: number;
  student_id: string; // Backend uses snake_case
  amount: number;
  payment_date: string; // Backend uses snake_case
  payment_method: "cash" | "bank_transfer" | "check"; // Backend uses snake_case
  notes?: string;
  created_at: string; // Backend uses snake_case

  // UI compatibility aliases
  studentId?: string; // Alias for student_id
  paymentDate?: string; // Alias for payment_date
  paymentMethod?: "cash" | "bank_transfer" | "check"; // Alias for payment_method
  createdAt?: string; // Alias for created_at
}

export interface PaymentPlanConfig {
  oneTimeAmount: number;
  monthlyAmount: number;
  installmentAmount: number;
  installmentInterval: number;
  reminderDays: number;
}

export interface AppSettings {
  payment_threshold: number; // Backend uses snake_case
  default_groups: string[]; // Backend uses snake_case
  enable_audit_log: boolean; // Backend uses snake_case
  language: "en" | "ar";
  theme: "light" | "dark";
  enable_multi_user: boolean; // Backend uses snake_case
  backup_encryption: boolean; // Backend uses snake_case
  accessibility_mode: boolean; // Backend uses snake_case
  reminder_days: number; // Backend uses snake_case

  // UI compatibility aliases
  paymentThreshold?: number; // Alias for payment_threshold
  defaultGroups?: string[]; // Alias for default_groups
  enableAuditLog?: boolean; // Alias for enable_audit_log
  enableMultiUser?: boolean; // Alias for enable_multi_user
  backupEncryption?: boolean; // Alias for backup_encryption
  accessibilityMode?: boolean; // Alias for accessibility_mode
}

export interface User {
  id: string;
  username: string;
  role: "admin" | "user" | "readonly";
  createdAt: string;
  lastLogin?: string;
}

export interface PaymentSummary {
  totalStudents: number;
  paidStudents: number;
  overdueStudents: number;
  dueSoonStudents: number;
  totalRevenue: number;
  pendingRevenue: number;
}
