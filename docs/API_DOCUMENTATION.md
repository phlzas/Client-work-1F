# API Documentation

This document outlines the Tauri IPC commands available in the Student Management System.

## Student Management Commands

### `get_all_students_with_attendance`

Retrieves all students with their attendance logs and payment history.

**Parameters:** None

**Returns:** `Array<StudentWithAttendance>`

### `get_student_by_id`

Retrieves a specific student by their ID.

**Parameters:**

- `id: string` - Student ID

**Returns:** `Student | null`

### `add_student`

Creates a new student record.

**Parameters:**

- `name: string` - Student name
- `groupName: string` - Group name
- `paymentPlan: "one-time" | "monthly" | "installment"` - Payment plan type
- `planAmount: number` - Payment plan amount
- `installmentCount?: number` - Number of installments (required for installment plans)
- `paidAmount?: number` - Amount already paid (default: 0)
- `enrollmentDate?: string` - Enrollment date (default: current date)

**Returns:** `Student`

### `update_student`

Updates an existing student record.

**Parameters:**

- `id: string` - Student ID
- `name: string` - Student name
- `groupName: string` - Group name
- `paymentPlan: "one-time" | "monthly" | "installment"` - Payment plan type
- `planAmount: number` - Payment plan amount
- `installmentCount?: number` - Number of installments
- `paidAmount?: number` - Amount already paid
- `enrollmentDate?: string` - Enrollment date

**Returns:** `void`

### `delete_student`

Deletes a student record.

**Parameters:**

- `id: string` - Student ID

**Returns:** `void`

### `get_students_by_group`

Retrieves all students in a specific group.

**Parameters:**

- `groupName: string` - Group name

**Returns:** `Array<Student>`

### `get_students_by_payment_status`

Retrieves students by payment status.

**Parameters:**

- `status: string` - Payment status ("paid", "pending", "overdue", "due_soon")

**Returns:** `Array<Student>`

### `get_overdue_students`

Retrieves all students with overdue payments.

**Parameters:** None

**Returns:** `Array<Student>`

### `get_due_soon_students`

Retrieves all students with payments due soon.

**Parameters:** None

**Returns:** `Array<Student>`

### `update_payment_statuses`

Updates payment statuses for all students based on current date and payment plans.

**Parameters:** None

**Returns:** `void`

### `get_student_statistics`

Retrieves student statistics summary.

**Parameters:** None

**Returns:** `StudentStatistics`

## Attendance Management Commands

### `mark_attendance`

Marks attendance for a student on a specific date.

**Parameters:**

- `studentId: string` - Student ID
- `date?: string` - Date (default: current date)

**Returns:** `AttendanceRecord`

### `check_attendance_today`

Checks if a student has attendance marked for today.

**Parameters:**

- `studentId: string` - Student ID

**Returns:** `boolean`

### `check_attendance_on_date`

Checks if a student has attendance marked for a specific date.

**Parameters:**

- `studentId: string` - Student ID
- `date: string` - Date to check

**Returns:** `boolean`

### `get_attendance_history`

Retrieves attendance history with optional filters.

**Parameters:**

- `studentId?: string` - Student ID filter
- `startDate?: string` - Start date filter
- `endDate?: string` - End date filter
- `groupName?: string` - Group name filter

**Returns:** `Array<AttendanceRecord>`

### `get_student_attendance_history`

Retrieves attendance history for a specific student.

**Parameters:**

- `studentId: string` - Student ID

**Returns:** `Array<AttendanceRecord>`

### `get_student_attendance_stats`

Retrieves attendance statistics for a specific student.

**Parameters:**

- `studentId: string` - Student ID
- `startDate?: string` - Start date filter
- `endDate?: string` - End date filter

**Returns:** `AttendanceStatistics`

### `get_daily_attendance_summary`

Retrieves attendance summary for a specific date.

**Parameters:**

- `date: string` - Date
- `groupName?: string` - Group name filter

**Returns:** `DailyAttendanceSummary`

### `delete_attendance`

Deletes an attendance record.

**Parameters:**

- `studentId: string` - Student ID
- `date: string` - Date

**Returns:** `boolean`

## Payment Management Commands

### `record_payment`

Records a payment transaction.

**Parameters:**

- `studentId: string` - Student ID
- `amount: number` - Payment amount
- `paymentDate: string` - Payment date
- `paymentMethod: "cash" | "bank_transfer" | "check"` - Payment method
- `notes?: string` - Optional notes

**Returns:** `PaymentTransaction`

### `get_payment_history`

Retrieves payment history with optional filters.

**Parameters:**

- `studentId?: string` - Student ID filter
- `startDate?: string` - Start date filter
- `endDate?: string` - End date filter
- `paymentMethod?: string` - Payment method filter
- `minAmount?: number` - Minimum amount filter
- `maxAmount?: number` - Maximum amount filter

**Returns:** `Array<PaymentTransaction>`

### `get_student_payment_history`

Retrieves payment history for a specific student.

**Parameters:**

- `studentId: string` - Student ID

**Returns:** `Array<PaymentTransaction>`

### `get_payment_summary`

Retrieves payment summary statistics.

**Parameters:** None

**Returns:** `PaymentSummary`

### `update_student_payment_status`

Updates payment status for a specific student.

**Parameters:**

- `studentId: string` - Student ID

**Returns:** `void`

### `update_all_payment_statuses`

Updates payment statuses for all students.

**Parameters:** None

**Returns:** `void`

### `delete_payment`

Deletes a payment transaction.

**Parameters:**

- `payment_id: number` - Payment transaction ID

**Returns:** `boolean`

## Group Management Commands

### `get_all_groups`

Retrieves all groups.

**Parameters:** None

**Returns:** `Array<Group>`

### `get_all_groups_with_counts`

Retrieves all groups with student counts.

**Parameters:** None

**Returns:** `Array<GroupWithCount>`

### `add_group`

Creates a new group.

**Parameters:**

- `name: string` - Group name

**Returns:** `Group`

### `update_group`

Updates an existing group.

**Parameters:**

- `id: number` - Group ID
- `name: string` - New group name

**Returns:** `void`

### `delete_group`

Deletes a group.

**Parameters:**

- `id: number` - Group ID

**Returns:** `boolean`

### `get_students_count_by_group_id`

Gets the number of students in a specific group.

**Parameters:**

- `groupId: number` - Group ID

**Returns:** `number`

### `force_delete_group_with_reassignment`

Force deletes a group and reassigns students to a default group.

**Parameters:**

- `id: number` - Group ID
- `default_group_name: string` - Default group name for reassignment

**Returns:** `boolean`

## Settings Management Commands

### `get_settings`

Retrieves application settings.

**Parameters:** None

**Returns:** `AppSettings`

### `update_settings`

Updates application settings.

**Parameters:**

- `settings: AppSettings` - Settings object

**Returns:** `void`

### `get_setting`

Retrieves a specific setting value.

**Parameters:**

- `key: string` - Setting key

**Returns:** `string | null`

### `set_setting`

Sets a specific setting value.

**Parameters:**

- `key: string` - Setting key
- `value: string` - Setting value

**Returns:** `void`

### `reset_settings_to_defaults`

Resets all settings to default values.

**Parameters:** None

**Returns:** `void`

## Payment Settings Commands

### `get_payment_settings`

Retrieves payment settings configuration.

**Parameters:** None

**Returns:** `PaymentSettings`

### `update_payment_settings`

Updates payment settings configuration.

**Parameters:**

- `settings: PaymentSettings` - Payment settings object

**Returns:** `void`

## Utility Commands

### `get_current_date`

Gets the current date in YYYY-MM-DD format.

**Parameters:** None

**Returns:** `string`

### `format_date`

Formats a date string.

**Parameters:**

- `date_str: string` - Date string to format

**Returns:** `string`

### `ensure_default_groups_exist`

Ensures default groups exist in the database.

**Parameters:** None

**Returns:** `void`

### `ensure_payment_settings_exist`

Ensures payment settings exist in the database.

**Parameters:** None

**Returns:** `void`

## Data Types

### Student

```typescript
interface Student {
  id: string;
  name: string;
  group_name: string;
  payment_plan: "one-time" | "monthly" | "installment";
  plan_amount: number;
  installment_count?: number;
  paid_amount: number;
  enrollment_date: string;
  next_due_date?: string;
  payment_status: "paid" | "pending" | "overdue" | "due_soon";
  created_at: string;
  updated_at: string;
}
```

### StudentWithAttendance

```typescript
interface StudentWithAttendance extends Student {
  attendance_log: AttendanceRecord[];
  payment_history: PaymentTransaction[];
}
```

### AttendanceRecord

```typescript
interface AttendanceRecord {
  id: number;
  student_id: string;
  date: string;
  created_at: string;
}
```

### PaymentTransaction

```typescript
interface PaymentTransaction {
  id: number;
  student_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
  created_at: string;
}
```

### Group

```typescript
interface Group {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}
```

### GroupWithCount

```typescript
interface GroupWithCount extends Group {
  student_count: number;
}
```

### PaymentSettings

```typescript
interface PaymentSettings {
  id: number;
  one_time_amount: number;
  monthly_amount: number;
  installment_amount: number;
  installment_interval_months: number;
  reminder_days: number;
  payment_threshold: number;
  updated_at: string;
}
```
