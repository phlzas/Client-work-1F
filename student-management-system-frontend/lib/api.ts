import { invoke } from "@tauri-apps/api/core";
import type {
  Student,
  AttendanceRecord,
  PaymentTransaction,
  AppSettings,
} from "@/types";

// Note: Backend uses snake_case, frontend types handle both snake_case and camelCase for compatibility

/**
 * Interface for student statistics response
 */
interface StudentStatistics {
  total_students: number;
  active_students: number;
  overdue_students: number;
  due_soon_students: number;
  paid_students: number;
  total_revenue: number;
  pending_revenue: number;
}

/**
 * Interface for attendance statistics response
 */
interface AttendanceStatistics {
  total_days: number;
  present_days: number;
  attendance_rate: number;
}

/**
 * Interface for payment summary response
 */
interface PaymentSummary {
  total_students: number;
  paid_students: number;
  overdue_students: number;
  due_soon_students: number;
  total_revenue: number;
  pending_revenue: number;
}

/**
 * Interface for daily attendance summary
 */
interface DailyAttendanceSummary {
  date: string;
  total_students: number;
  present_students: number;
  attendance_rate: number;
  present_student_ids: string[];
}

// Note: Inline interfaces are used directly in method return types for better type safety

/**
 * Custom error class for API operations
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * API service for communicating with the Tauri backend
 * This service provides type-safe methods for all backend operations
 */
export class ApiService {
  // Request deduplication cache
  private static readonly requestCache = new Map<string, Promise<any>>();

  // Command constants organized by domain for better maintainability
  private static readonly COMMANDS = {
    // Student domain
    STUDENT: {
      GET_ALL: "get_all_students_with_attendance",
      GET_BY_ID: "get_student_by_id",
      ADD: "add_student",
      UPDATE: "update_student",
      DELETE: "delete_student",
      GET_BY_GROUP: "get_students_by_group",
      GET_BY_PAYMENT_STATUS: "get_students_by_payment_status",
      GET_OVERDUE: "get_overdue_students",
      GET_DUE_SOON: "get_due_soon_students",
      UPDATE_PAYMENT_STATUSES: "update_payment_statuses",
      GET_STATISTICS: "get_student_statistics",
    },

    // Attendance domain
    ATTENDANCE: {
      MARK: "mark_attendance",
      CHECK_TODAY: "check_attendance_today",
      CHECK_ON_DATE: "check_attendance_on_date",
      GET_HISTORY: "get_attendance_history",
      GET_STUDENT_HISTORY: "get_student_attendance_history",
      GET_STUDENT_STATS: "get_student_attendance_stats",
      GET_DAILY_SUMMARY: "get_daily_attendance_summary",
      DELETE: "delete_attendance",
    },

    // Payment domain
    PAYMENT: {
      RECORD: "record_payment",
      GET_HISTORY: "get_payment_history",
      GET_STUDENT_HISTORY: "get_student_payment_history",
      GET_SUMMARY: "get_payment_summary",
      UPDATE_STUDENT_STATUS: "update_student_payment_status",
      UPDATE_ALL_STATUSES: "update_all_payment_statuses",
      DELETE: "delete_payment",
    },

    // Settings domain
    SETTINGS: {
      GET: "get_settings",
      UPDATE: "update_settings",
      GET_SINGLE: "get_setting",
      SET_SINGLE: "set_setting",
      RESET_TO_DEFAULTS: "reset_settings_to_defaults",
    },

    // Utility domain
    UTILITY: {
      GET_CURRENT_DATE: "get_current_date",
      FORMAT_DATE: "format_date",
    },
  } as const;
  /**
   * Wrapper for invoke calls with consistent error handling and request deduplication
   */
  private static async safeInvoke<T>(
    command: string,
    args?: Record<string, unknown>,
    options: {
      deduplicate?: boolean;
      retries?: number;
      logLevel?: "debug" | "info" | "error";
    } = {}
  ): Promise<T> {
    const { deduplicate = false, retries = 0, logLevel = "info" } = options;
    const cacheKey = deduplicate ? `${command}:${JSON.stringify(args)}` : null;

    // Return cached promise if deduplication is enabled
    if (cacheKey && this.requestCache.has(cacheKey)) {
      if (logLevel === "debug") {
        console.log(`[API] Using cached request: ${command}`);
      }
      return this.requestCache.get(cacheKey)!;
    }

    const executeRequest = async (attempt = 0): Promise<T> => {
      const startTime = performance.now();

      try {
        if (logLevel === "debug") {
          console.log(`[API] Executing: ${command}`, args ? { args } : "");
        }

        const result = await invoke<T>(command, args);

        const duration = performance.now() - startTime;
        if (logLevel === "debug") {
          console.log(`[API] Success: ${command} (${duration.toFixed(2)}ms)`);
        }

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Retry logic for transient errors
        if (attempt < retries && this.isRetryableError(error)) {
          console.warn(
            `[API] Retrying ${command} (attempt ${attempt + 1}/${retries + 1})`
          );
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          return executeRequest(attempt + 1);
        }

        if (logLevel !== "error") {
          console.error(`[API] Failed: ${command} (${duration.toFixed(2)}ms)`, {
            error,
            args,
            timestamp: new Date().toISOString(),
          });
        }

        const errorMessage = this.extractErrorMessage(error, command);
        throw new ApiError(errorMessage, command, error);
      }
    };

    const promise = executeRequest();

    // Cache the promise if deduplication is enabled
    if (cacheKey) {
      this.requestCache.set(cacheKey, promise);
      // Clean up cache after request completes
      promise.finally(() => {
        setTimeout(() => this.requestCache.delete(cacheKey), 1000);
      });
    }

    return promise;
  }

  /**
   * Check if an error is retryable (network issues, timeouts, etc.)
   */
  private static isRetryableError(error: unknown): boolean {
    if (typeof error === "string") {
      return (
        error.includes("timeout") ||
        error.includes("network") ||
        error.includes("connection")
      );
    }
    if (typeof error === "object" && error !== null) {
      const errorObj = error as Record<string, unknown>;
      return errorObj.code === "NETWORK_ERROR" || errorObj.code === "TIMEOUT";
    }
    return false;
  }

  /**
   * Simple delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Extracts a meaningful error message from various error types
   */
  private static extractErrorMessage(error: unknown, command: string): string {
    let baseMessage = `Failed to execute ${command}`;

    if (!error) return baseMessage;

    if (typeof error === "string") {
      return `${baseMessage}: ${error}`;
    }

    if (typeof error === "object") {
      const errorObj = error as Record<string, unknown>;

      // Try different common error message properties
      const message = errorObj.message || errorObj.error || errorObj.details;
      if (typeof message === "string") {
        return `${baseMessage}: ${message}`;
      }

      // If it's a structured error, try to extract useful info
      if (errorObj.code) {
        return `${baseMessage} (Code: ${errorObj.code})`;
      }
    }

    return `${baseMessage}: ${String(error)}`;
  }

  /**
   * Sanitizes string input by trimming and removing potentially harmful characters
   */
  private static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, "");
  }

  /**
   * Validates student data for add/update operations
   */
  private static validateStudentData(
    name: string,
    groupName: string,
    paymentPlan: "one-time" | "monthly" | "installment",
    planAmount: number,
    installmentCount: number | undefined,
    operation: string
  ): void {
    if (!name?.trim()) {
      throw new ApiError("Student name is required", operation);
    }
    if (!groupName?.trim()) {
      throw new ApiError("Group name is required", operation);
    }
    if (planAmount <= 0) {
      throw new ApiError("Plan amount must be positive", operation);
    }
    if (
      paymentPlan === "installment" &&
      (!installmentCount || installmentCount <= 0)
    ) {
      throw new ApiError(
        "Installment count is required for installment plans",
        operation
      );
    }
  }
  // Student-related methods
  static async getAllStudents(): Promise<Student[]> {
    return await this.safeInvoke<Student[]>(this.COMMANDS.STUDENT.GET_ALL);
  }

  static async getStudentById(id: string): Promise<Student | null> {
    if (!id?.trim()) {
      throw new ApiError("Student ID is required", "getStudentById");
    }
    return await this.safeInvoke<Student | null>(
      this.COMMANDS.STUDENT.GET_BY_ID,
      { id }
    );
  }

  static async addStudent(
    name: string,
    groupName: string,
    paymentPlan: "one-time" | "monthly" | "installment",
    planAmount: number,
    installmentCount?: number
  ): Promise<Student> {
    this.validateStudentData(
      name,
      groupName,
      paymentPlan,
      planAmount,
      installmentCount,
      "addStudent"
    );

    const params = {
      name: this.sanitizeString(name),
      group_name: this.sanitizeString(groupName),
      payment_plan: paymentPlan,
      plan_amount: planAmount,
      installment_count: installmentCount,
    };

    return await this.safeInvoke<Student>(this.COMMANDS.STUDENT.ADD, params);
  }

  static async updateStudent(
    id: string,
    name: string,
    groupName: string,
    paymentPlan: "one-time" | "monthly" | "installment",
    planAmount: number,
    installmentCount?: number
  ): Promise<void> {
    if (!id?.trim()) {
      throw new ApiError("Student ID is required", "updateStudent");
    }

    // Reuse existing validation logic
    this.validateStudentData(
      name,
      groupName,
      paymentPlan,
      planAmount,
      installmentCount,
      "updateStudent"
    );

    return await this.safeInvoke<void>(this.COMMANDS.STUDENT.UPDATE, {
      id: id.trim(),
      name: this.sanitizeString(name),
      group_name: this.sanitizeString(groupName),
      payment_plan: paymentPlan,
      plan_amount: planAmount,
      installment_count: installmentCount,
    });
  }

  static async deleteStudent(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new ApiError("Student ID is required", "deleteStudent");
    }
    return await this.safeInvoke<void>(this.COMMANDS.STUDENT.DELETE, {
      id: id.trim(),
    });
  }

  static async getStudentsByGroup(groupName: string): Promise<Student[]> {
    if (!groupName?.trim()) {
      throw new ApiError("Group name is required", "getStudentsByGroup");
    }
    return await this.safeInvoke<Student[]>(
      this.COMMANDS.STUDENT.GET_BY_GROUP,
      {
        group_name: groupName.trim(),
      }
    );
  }

  static async getStudentsByPaymentStatus(status: string): Promise<Student[]> {
    if (!status?.trim()) {
      throw new ApiError(
        "Payment status is required",
        "getStudentsByPaymentStatus"
      );
    }
    return await this.safeInvoke<Student[]>("get_students_by_payment_status", {
      status: status.trim(),
    });
  }

  static async getOverdueStudents(): Promise<Student[]> {
    return await this.safeInvoke<Student[]>("get_overdue_students");
  }

  static async getDueSoonStudents(): Promise<Student[]> {
    return await this.safeInvoke<Student[]>("get_due_soon_students");
  }

  static async updatePaymentStatuses(): Promise<void> {
    return await this.safeInvoke<void>("update_payment_statuses");
  }

  static async getStudentStatistics(): Promise<StudentStatistics> {
    return await this.safeInvoke<StudentStatistics>(
      this.COMMANDS.STUDENT.GET_STATISTICS
    );
  }

  // Attendance-related methods
  static async markAttendance(
    studentId: string,
    date?: string
  ): Promise<AttendanceRecord> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "markAttendance");
    }
    const attendanceDate = date || (await this.getCurrentDate());
    return await this.safeInvoke<AttendanceRecord>(
      this.COMMANDS.ATTENDANCE.MARK,
      {
        student_id: studentId.trim(),
        date: attendanceDate,
      }
    );
  }

  static async checkAttendanceToday(studentId: string): Promise<boolean> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "checkAttendanceToday");
    }
    return await this.safeInvoke<boolean>("check_attendance_today", {
      student_id: studentId.trim(),
    });
  }

  static async checkAttendanceOnDate(
    studentId: string,
    date: string
  ): Promise<boolean> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "checkAttendanceOnDate");
    }
    if (!date?.trim()) {
      throw new ApiError("Date is required", "checkAttendanceOnDate");
    }
    return await this.safeInvoke<boolean>("check_attendance_on_date", {
      student_id: studentId.trim(),
      date: date.trim(),
    });
  }

  static async getAttendanceHistory(
    studentId?: string,
    startDate?: string,
    endDate?: string,
    groupName?: string
  ): Promise<AttendanceRecord[]> {
    return await this.safeInvoke<AttendanceRecord[]>("get_attendance_history", {
      student_id: studentId?.trim(),
      start_date: startDate?.trim(),
      end_date: endDate?.trim(),
      group_name: groupName?.trim(),
    });
  }

  static async getStudentAttendanceHistory(
    studentId: string
  ): Promise<AttendanceRecord[]> {
    if (!studentId?.trim()) {
      throw new ApiError(
        "Student ID is required",
        "getStudentAttendanceHistory"
      );
    }
    return await this.safeInvoke<AttendanceRecord[]>(
      "get_student_attendance_history",
      {
        student_id: studentId.trim(),
      }
    );
  }

  static async getStudentAttendanceStats(
    studentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceStatistics> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "getStudentAttendanceStats");
    }
    return await this.safeInvoke("get_student_attendance_stats", {
      student_id: studentId.trim(),
      start_date: startDate?.trim(),
      end_date: endDate?.trim(),
    });
  }

  static async getDailyAttendanceSummary(
    date: string,
    groupName?: string
  ): Promise<{
    date: string;
    total_students: number;
    present_students: number;
    attendance_rate: number;
    present_student_ids: string[];
  }> {
    if (!date?.trim()) {
      throw new ApiError("Date is required", "getDailyAttendanceSummary");
    }
    return await this.safeInvoke("get_daily_attendance_summary", {
      date: date.trim(),
      group_name: groupName?.trim(),
    });
  }

  static async deleteAttendance(
    studentId: string,
    date: string
  ): Promise<boolean> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "deleteAttendance");
    }
    if (!date?.trim()) {
      throw new ApiError("Date is required", "deleteAttendance");
    }
    return await this.safeInvoke<boolean>("delete_attendance", {
      student_id: studentId.trim(),
      date: date.trim(),
    });
  }

  static async getCurrentDate(): Promise<string> {
    return await this.safeInvoke<string>(
      this.COMMANDS.UTILITY.GET_CURRENT_DATE
    );
  }

  // Payment-related methods
  static async recordPayment(
    studentId: string,
    amount: number,
    paymentDate: string,
    paymentMethod: "cash" | "bank_transfer" | "check",
    notes?: string
  ): Promise<PaymentTransaction> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "recordPayment");
    }
    if (amount <= 0) {
      throw new ApiError("Payment amount must be positive", "recordPayment");
    }
    if (!paymentDate?.trim()) {
      throw new ApiError("Payment date is required", "recordPayment");
    }
    return await this.safeInvoke<PaymentTransaction>("record_payment", {
      student_id: studentId.trim(),
      amount,
      payment_date: paymentDate.trim(),
      payment_method: paymentMethod,
      notes: notes?.trim(),
    });
  }

  static async getPaymentHistory(
    studentId?: string,
    startDate?: string,
    endDate?: string,
    paymentMethod?: string,
    minAmount?: number,
    maxAmount?: number
  ): Promise<PaymentTransaction[]> {
    return await this.safeInvoke<PaymentTransaction[]>("get_payment_history", {
      student_id: studentId?.trim(),
      start_date: startDate?.trim(),
      end_date: endDate?.trim(),
      payment_method: paymentMethod?.trim(),
      min_amount: minAmount,
      max_amount: maxAmount,
    });
  }

  static async getStudentPaymentHistory(
    studentId: string
  ): Promise<PaymentTransaction[]> {
    if (!studentId?.trim()) {
      throw new ApiError("Student ID is required", "getStudentPaymentHistory");
    }
    return await this.safeInvoke<PaymentTransaction[]>(
      "get_student_payment_history",
      {
        student_id: studentId.trim(),
      }
    );
  }

  static async getPaymentSummary(): Promise<{
    total_students: number;
    paid_students: number;
    overdue_students: number;
    due_soon_students: number;
    total_revenue: number;
    pending_revenue: number;
  }> {
    return await this.safeInvoke<{
      total_students: number;
      paid_students: number;
      overdue_students: number;
      due_soon_students: number;
      total_revenue: number;
      pending_revenue: number;
    }>(this.COMMANDS.PAYMENT.GET_SUMMARY);
  }

  static async updateStudentPaymentStatus(studentId: string): Promise<void> {
    if (!studentId?.trim()) {
      throw new ApiError(
        "Student ID is required",
        "updateStudentPaymentStatus"
      );
    }
    return await this.safeInvoke<void>("update_student_payment_status", {
      student_id: studentId.trim(),
    });
  }

  static async updateAllPaymentStatuses(): Promise<void> {
    return await this.safeInvoke<void>("update_all_payment_statuses");
  }

  static async deletePayment(paymentId: number): Promise<boolean> {
    if (!paymentId || paymentId <= 0) {
      throw new ApiError("Valid payment ID is required", "deletePayment");
    }
    return await this.safeInvoke<boolean>("delete_payment", {
      payment_id: paymentId,
    });
  }

  // Settings-related methods
  static async getSettings(): Promise<AppSettings> {
    return await this.safeInvoke<AppSettings>(this.COMMANDS.SETTINGS.GET);
  }

  static async updateSettings(settings: AppSettings): Promise<void> {
    if (!settings) {
      throw new ApiError("Settings object is required", "updateSettings");
    }
    return await this.safeInvoke<void>(this.COMMANDS.SETTINGS.UPDATE, {
      settings,
    });
  }

  static async getSetting(key: string): Promise<string | null> {
    if (!key?.trim()) {
      throw new ApiError("Setting key is required", "getSetting");
    }
    return await this.safeInvoke<string | null>(
      this.COMMANDS.SETTINGS.GET_SINGLE,
      {
        key: key.trim(),
      }
    );
  }

  static async setSetting(key: string, value: string): Promise<void> {
    if (!key?.trim()) {
      throw new ApiError("Setting key is required", "setSetting");
    }
    if (!value?.trim()) {
      throw new ApiError("Setting value is required", "setSetting");
    }
    return await this.safeInvoke<void>(this.COMMANDS.SETTINGS.SET_SINGLE, {
      key: key.trim(),
      value: value.trim(),
    });
  }

  static async resetSettingsToDefaults(): Promise<void> {
    return await this.safeInvoke<void>(
      this.COMMANDS.SETTINGS.RESET_TO_DEFAULTS
    );
  }

  // Groups-related methods
  static async getAllGroups(): Promise<
    Array<{ id: number; name: string; created_at: string; updated_at: string }>
  > {
    return await this.safeInvoke<
      Array<{
        id: number;
        name: string;
        created_at: string;
        updated_at: string;
      }>
    >("get_all_groups");
  }

  static async getAllGroupsWithCounts(): Promise<
    Array<{
      id: number;
      name: string;
      student_count: number;
      created_at: string;
      updated_at: string;
    }>
  > {
    return await this.safeInvoke<
      Array<{
        id: number;
        name: string;
        student_count: number;
        created_at: string;
        updated_at: string;
      }>
    >("get_all_groups_with_counts");
  }

  static async addGroup(name: string): Promise<{
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  }> {
    if (!name?.trim()) {
      throw new ApiError("Group name is required", "addGroup");
    }
    return await this.safeInvoke<{
      id: number;
      name: string;
      created_at: string;
      updated_at: string;
    }>("add_group", {
      name: this.sanitizeString(name),
    });
  }

  static async updateGroup(id: number, name: string): Promise<void> {
    if (!id || id <= 0) {
      throw new ApiError("Valid group ID is required", "updateGroup");
    }
    if (!name?.trim()) {
      throw new ApiError("Group name is required", "updateGroup");
    }
    return await this.safeInvoke<void>("update_group", {
      id,
      name: this.sanitizeString(name),
    });
  }

  static async deleteGroup(id: number): Promise<boolean> {
    if (!id || id <= 0) {
      throw new ApiError("Valid group ID is required", "deleteGroup");
    }
    return await this.safeInvoke<boolean>("delete_group", { id });
  }

  static async getStudentsCountByGroupId(groupId: number): Promise<number> {
    if (!groupId || groupId <= 0) {
      throw new ApiError(
        "Valid group ID is required",
        "getStudentsCountByGroupId"
      );
    }
    return await this.safeInvoke<number>("get_students_count_by_group_id", {
      group_id: groupId,
    });
  }

  // Payment Settings-related methods
  static async getPaymentSettings(): Promise<{
    id: number;
    one_time_amount: number;
    monthly_amount: number;
    installment_amount: number;
    installment_interval_months: number;
    reminder_days: number;
    payment_threshold: number;
    updated_at: string;
  }> {
    return await this.safeInvoke<{
      id: number;
      one_time_amount: number;
      monthly_amount: number;
      installment_amount: number;
      installment_interval_months: number;
      reminder_days: number;
      payment_threshold: number;
      updated_at: string;
    }>("get_payment_settings");
  }

  static async updatePaymentSettings(settings: {
    one_time_amount: number;
    monthly_amount: number;
    installment_amount: number;
    installment_interval_months: number;
    reminder_days: number;
    payment_threshold: number;
  }): Promise<void> {
    return await this.safeInvoke<void>("update_payment_settings", { settings });
  }

  static async ensureDefaultGroupsExist(): Promise<void> {
    return await this.safeInvoke<void>("ensure_default_groups_exist");
  }

  static async ensurePaymentSettingsExist(): Promise<void> {
    return await this.safeInvoke<void>("ensure_payment_settings_exist");
  }

  // Utility methods
  static async formatDate(dateStr: string): Promise<string> {
    if (!dateStr?.trim()) {
      throw new ApiError("Date string is required", "formatDate");
    }
    return await this.safeInvoke<string>(this.COMMANDS.UTILITY.FORMAT_DATE, {
      date_str: dateStr.trim(),
    });
  }

  // Export functionality
  /**
   * Export all students to CSV format
   * @returns Promise<string> CSV content as string
   * @throws Error if data retrieval fails
   */
  static async exportStudentsToCSV(): Promise<string> {
    try {
      const students = await this.getAllStudents();
      return this.convertStudentsToCSV(students);
    } catch (error) {
      throw new ApiError(
        "Failed to export student data",
        "exportStudentsToCSV",
        error
      );
    }
  }

  /**
   * Export attendance records to CSV format
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @param groupName Optional group name filter
   * @returns Promise<string> CSV content as string
   * @throws Error if data retrieval fails
   */
  static async exportAttendanceToCSV(
    startDate?: string,
    endDate?: string,
    groupName?: string
  ): Promise<string> {
    try {
      const attendance = await this.getAttendanceHistory(
        undefined,
        startDate,
        endDate,
        groupName
      );
      return this.convertAttendanceToCSV(attendance);
    } catch (error) {
      throw new ApiError(
        "Failed to export attendance data",
        "exportAttendanceToCSV",
        error
      );
    }
  }

  /**
   * Export payment transactions to CSV format
   * @param startDate Optional start date filter
   * @param endDate Optional end date filter
   * @param studentId Optional student ID filter
   * @returns Promise<string> CSV content as string
   * @throws Error if data retrieval fails
   */
  static async exportPaymentsToCSV(
    startDate?: string,
    endDate?: string,
    studentId?: string
  ): Promise<string> {
    try {
      const payments = await this.getPaymentHistory(
        studentId,
        startDate,
        endDate
      );
      return this.convertPaymentsToCSV(payments);
    } catch (error) {
      throw new ApiError(
        "Failed to export payment data",
        "exportPaymentsToCSV",
        error
      );
    }
  }

  // Property access helpers for consistent data retrieval
  private static getStudentProperty<T>(
    student: Student,
    snakeCase: keyof Student,
    camelCase: keyof Student,
    defaultValue: T
  ): T {
    return (student[snakeCase] ?? student[camelCase] ?? defaultValue) as T;
  }

  private static getRecordProperty<T>(
    record: AttendanceRecord | PaymentTransaction,
    snakeCase: string,
    camelCase: string,
    defaultValue: T
  ): T {
    return ((record as any)[snakeCase] ??
      (record as any)[camelCase] ??
      defaultValue) as T;
  }

  // CSV conversion helpers
  private static convertStudentsToCSV(students: Student[]): string {
    const headers = [
      "Student ID",
      "Name",
      "Group",
      "Payment Plan",
      "Plan Amount",
      "Paid Amount",
      "Payment Status",
      "Next Due Date",
      "Enrollment Date",
      "Attendance Count",
    ];

    const rows = students.map((student) => [
      student.id,
      student.name,
      this.getStudentProperty(student, "group_name", "group", ""),
      this.getStudentProperty(
        student,
        "payment_plan",
        "paymentPlan",
        "one-time"
      ),
      this.getStudentProperty(
        student,
        "plan_amount",
        "planAmount",
        0
      ).toString(),
      this.getStudentProperty(
        student,
        "paid_amount",
        "paidAmount",
        0
      ).toString(),
      this.getStudentProperty(
        student,
        "payment_status",
        "paymentStatus",
        "pending"
      ),
      this.getStudentProperty(student, "next_due_date", "nextDueDate", "N/A"),
      this.getStudentProperty(student, "enrollment_date", "enrollmentDate", ""),
      (
        this.getStudentProperty(
          student,
          "attendance_log",
          "attendanceLog",
          []
        ) as any[]
      ).length.toString(),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => this.escapeCsvField(field)).join(","))
      .join("\n");
  }

  private static convertAttendanceToCSV(
    attendance: AttendanceRecord[]
  ): string {
    const headers = ["ID", "Student ID", "Date", "Created At"];

    const rows = attendance.map((record) => [
      record.id.toString(),
      this.getRecordProperty(record, "student_id", "studentId", ""),
      record.date,
      this.getRecordProperty(record, "created_at", "createdAt", ""),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => this.escapeCsvField(field)).join(","))
      .join("\n");
  }

  private static convertPaymentsToCSV(payments: PaymentTransaction[]): string {
    const headers = [
      "ID",
      "Student ID",
      "Amount",
      "Payment Date",
      "Payment Method",
      "Notes",
      "Created At",
    ];

    const rows = payments.map((payment) => [
      payment.id.toString(),
      this.getRecordProperty(payment, "student_id", "studentId", ""),
      payment.amount.toString(),
      this.getRecordProperty(payment, "payment_date", "paymentDate", ""),
      this.getRecordProperty(payment, "payment_method", "paymentMethod", ""),
      payment.notes || "",
      this.getRecordProperty(payment, "created_at", "createdAt", ""),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((field) => this.escapeCsvField(field)).join(","))
      .join("\n");
  }

  /**
   * Properly escape CSV fields that contain commas, quotes, or newlines
   */
  private static escapeCsvField(field: string): string {
    const stringField = String(field);
    if (
      stringField.includes(",") ||
      stringField.includes('"') ||
      stringField.includes("\n")
    ) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  }
}
