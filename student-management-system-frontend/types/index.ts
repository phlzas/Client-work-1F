// Core data types for the Student Management System

export interface BaseStudent {
  id: string;
  name: string;
  group_name: string;
  payment_plan: "one-time" | "monthly" | "installment";
  plan_amount: number;
  paid_amount: number;
  enrollment_date: string;
  payment_status: "paid" | "pending" | "overdue" | "due_soon";
  next_due_date: string | null;
  installment_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Student extends BaseStudent {
  group?: string;
  paymentStatus?: string;
  paidAmount?: number;
  planAmount?: number;
  paymentPlan?: "one-time" | "monthly" | "installment";
  nextDueDate?: string | null;
  installmentCount?: number;
}

export interface BaseAttendanceRecord {
  id: number;
  student_id: string;
  date: string;
  created_at: string;
}

export interface AttendanceRecord extends BaseAttendanceRecord {
  studentId?: string;
  createdAt?: string;
}

export interface Group {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentSettings {
  one_time_amount: number;
  monthly_amount: number;
  installment_amount: number;
  installment_interval_months: number;
}

export interface AppSettings {
  payment_threshold: number;
  default_groups: string[];
  enable_audit_log: boolean;
  language: "ar" | "en";
  theme: "light" | "dark";
  enable_multi_user: boolean;
  backup_encryption: boolean;
  accessibility_mode: boolean;
  reminder_days: number;
}

export interface PaymentTransaction {
  id: number;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface QRCodeData {
  student_id: string;
  student_name: string;
  group_name: string;
  qr_code_base64: string;
}

export interface QRCodeBatch {
  group_name: string;
  qr_codes: QRCodeData[];
}

export interface QRCodeStatistics {
  total_qr_codes: number;
  groups_count: number;
  students_with_qr: number;
}

export interface BackupMetadata {
  file_path: string;
  created_at: string;
  file_size: number;
  student_count: number;
  encrypted: boolean;
  version: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  students_restored: number;
  attendance_restored: number;
  payments_restored: number;
  errors?: string[];
}

export interface BackupValidationResult {
  is_valid: boolean;
  message: string;
  metadata?: BackupMetadata;
  errors?: string[];
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AttendanceResponse {
  success: boolean;
  message: string;
  student_name: string;
  payment_status?: string;
}

export interface StudentFormData {
  name: string;
  group_name: string;
  payment_plan: "one-time" | "monthly" | "installment";
  plan_amount?: number;
  paid_amount?: number;
  enrollment_date?: string;
  installment_count?: number;
}

// Hook return types
export interface UseGroupsReturn {
  groups: Group[];
  loading: boolean;
  error: string | null;
  addGroup: (name: string) => Promise<void>;
  updateGroup: (id: number, name: string) => Promise<void>;
  deleteGroup: (id: number) => Promise<void>;
  refreshGroups: () => Promise<void>;
}

export interface UsePaymentSettingsReturn {
  settings: PaymentSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<PaymentSettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
}

// Component prop types
export interface StudentGridProps {
  students: Student[];
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onAddStudent: () => void;
  loading?: boolean;
}

export interface StudentFormProps {
  isOpen: boolean;
  student: Student | null;
  onSubmit: (data: StudentFormData) => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface QRScannerProps {
  onScan: (studentId: string) => void;
  result: string;
  loading?: boolean;
}

// Filter and search types
export interface StudentFilters {
  search: string;
  paymentStatus: string;
  group: string;
  paymentPlan: string;
}

export interface SortConfig {
  key: keyof Student;
  direction: "asc" | "desc";
}

// Export utility types
export type PaymentStatus = Student["payment_status"];
export type PaymentPlan = Student["payment_plan"];
export type Theme = AppSettings["theme"];
export type Language = AppSettings["language"];
