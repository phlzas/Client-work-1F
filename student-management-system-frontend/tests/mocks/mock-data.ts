import type { Student, AttendanceRecord } from "@/types";

// Mock student data
export const mockStudents: Student[] = [
  {
    id: "STU001",
    name: "أحمد محمد علي",
    group_name: "المجموعة الأولى",
    payment_plan: "one-time",
    plan_amount: 6000,
    paid_amount: 6000,
    enrollment_date: "2024-01-15",
    payment_status: "paid",
    next_due_date: null,
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "STU002",
    name: "فاطمة أحمد",
    group_name: "المجموعة الأولى",
    payment_plan: "monthly",
    plan_amount: 850,
    paid_amount: 850,
    enrollment_date: "2024-01-10",
    payment_status: "due_soon",
    next_due_date: "2024-02-10",
    created_at: "2024-01-10T10:00:00Z",
    updated_at: "2024-01-10T10:00:00Z",
  },
  {
    id: "STU003",
    name: "محمد سالم",
    group_name: "المجموعة الثانية",
    payment_plan: "installment",
    plan_amount: 2850,
    installment_count: 3,
    paid_amount: 0,
    enrollment_date: "2024-01-20",
    payment_status: "overdue",
    next_due_date: "2024-01-20",
    created_at: "2024-01-20T10:00:00Z",
    updated_at: "2024-01-20T10:00:00Z",
  },
];

// Mock attendance records
export const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: 1,
    student_id: "STU001",
    date: "2024-02-01",
    created_at: "2024-02-01T10:00:00Z",
  },
  {
    id: 2,
    student_id: "STU002",
    date: "2024-02-01",
    created_at: "2024-02-01T10:00:00Z",
  },
];

// Mock groups
export const mockGroups = [
  { id: 1, name: "المجموعة الأولى" },
  { id: 2, name: "المجموعة الثانية" },
];

// Mock payment settings
export const mockPaymentSettings = {
  one_time_amount: 6000,
  monthly_amount: 850,
  installment_amount: 2850,
  installment_interval_months: 3,
};
