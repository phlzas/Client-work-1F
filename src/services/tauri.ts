import { invoke } from "@tauri-apps/api/core";
import {
  Student,
  AttendanceRecord,
  AppSettings,
  AppliedMigration,
  MigrationValidation,
  SchemaInfo,
} from "../types";

// Student service functions
export const studentService = {
  async getAllStudents(): Promise<Student[]> {
    return await invoke("get_all_students");
  },

  async addStudent(
    name: string,
    group: string,
    paidAmount: number
  ): Promise<Student> {
    return await invoke("add_student", { name, group, paidAmount });
  },

  async updateStudent(
    id: string,
    name: string,
    group: string,
    paidAmount: number
  ): Promise<void> {
    return await invoke("update_student", { id, name, group, paidAmount });
  },

  async deleteStudent(id: string): Promise<void> {
    return await invoke("delete_student", { id });
  },

  async getStudentById(id: string): Promise<Student | null> {
    return await invoke("get_student_by_id", { id });
  },
};

// Attendance service functions
export const attendanceService = {
  async markAttendance(studentId: string, date: string): Promise<void> {
    return await invoke("mark_attendance", { studentId, date });
  },

  async getAttendanceHistory(studentId?: string): Promise<AttendanceRecord[]> {
    return await invoke("get_attendance_history", { studentId });
  },

  async checkAttendanceToday(studentId: string): Promise<boolean> {
    return await invoke("check_attendance_today", { studentId });
  },
};

// Export service functions
export const exportService = {
  async exportAttendanceCsv(filePath: string): Promise<void> {
    return await invoke("export_attendance_csv", { filePath });
  },

  async exportPaymentSummaryCsv(filePath: string): Promise<void> {
    return await invoke("export_payment_summary_csv", { filePath });
  },

  async exportQrCodesPdf(filePath: string, group?: string): Promise<void> {
    return await invoke("export_qr_codes_pdf", { filePath, group });
  },
};

// Settings service functions
export const settingsService = {
  async getSettings(): Promise<AppSettings> {
    return await invoke("get_settings");
  },

  async updateSettings(settings: AppSettings): Promise<void> {
    return await invoke("update_settings", { settings });
  },
};

// Backup service functions
export const backupService = {
  async createBackup(filePath: string, encrypt: boolean): Promise<void> {
    return await invoke("create_backup", { filePath, encrypt });
  },

  async restoreBackup(filePath: string, password?: string): Promise<void> {
    return await invoke("restore_backup", { filePath, password });
  },

  async validateBackup(filePath: string): Promise<boolean> {
    return await invoke("validate_backup", { filePath });
  },
};

// Migration service functions
export const migrationService = {
  async getMigrationHistory(): Promise<AppliedMigration[]> {
    return await invoke("get_migration_history");
  },

  async getSchemaInfo(): Promise<SchemaInfo> {
    return await invoke("get_schema_info");
  },

  async validateMigrations(): Promise<MigrationValidation> {
    return await invoke("validate_migrations");
  },

  async forceApplyMigration(version: number): Promise<void> {
    return await invoke("force_apply_migration", { version });
  },

  async markMigrationApplied(
    version: number,
    description: string
  ): Promise<void> {
    return await invoke("mark_migration_applied", { version, description });
  },
};
