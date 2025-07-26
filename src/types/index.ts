// Student interface
export interface Student {
  id: string;
  name: string;
  group: string;
  paidAmount: number;
  attendanceLog: AttendanceRecord[];
  paymentStatus: "Paid" | "Not Paid";
  createdAt: string;
  updatedAt: string;
}

// Attendance Record interface
export interface AttendanceRecord {
  id: number;
  studentId: string;
  date: string;
  createdAt: string;
}

// Application Settings interface
export interface AppSettings {
  paymentThreshold: number;
  defaultGroups: string[];
  enableAuditLog: boolean;
  language: "en" | "ar";
  theme: "light" | "dark";
  enableMultiUser: boolean;
  backupEncryption: boolean;
  accessibilityMode: boolean;
}

// User interface (Future Multi-User Support)
export interface User {
  id: string;
  username: string;
  role: "admin" | "user" | "readonly";
  createdAt: string;
  lastLogin?: string;
}

// Audit Log interface
export interface AuditLogEntry {
  id: number;
  actionType: string;
  tableName: string;
  recordId: string;
  oldValues?: string;
  newValues?: string;
  userId?: string;
  timestamp: string;
}

// Export data interfaces
export interface ExportOptions {
  includeAttendance: boolean;
  includePayments: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  groups?: string[];
}

// Migration-related interfaces
export interface AppliedMigration {
  version: number;
  description: string;
  appliedAt: string;
}

export interface MigrationValidation {
  isValid: boolean;
  issues: string[];
  appliedCount: number;
  totalCount: number;
}

export interface SchemaInfo {
  currentVersion: number;
  latestVersion: number;
  pendingMigrations: number;
  isUpToDate: boolean;
}

export interface DatabaseStats {
  studentsCount: number;
  attendanceCount: number;
  auditLogCount: number;
  databaseSizeBytes: number;
}
