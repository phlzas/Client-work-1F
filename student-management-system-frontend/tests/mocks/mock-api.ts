import { invoke } from "@tauri-apps/api/core";
import type { Student } from "@/types";
import { mockStudents, mockAttendanceRecords } from "./mock-data";

// Mock response types
export interface AttendanceResponse {
  success: boolean;
  message: string;
  student_name: string;
}

export interface AddStudentResponse {
  success: boolean;
  student: Student;
}

export interface DefaultResponse {
  success: boolean;
}

// Mock the Tauri API
const mockInvoke = invoke as jest.MockedFunction<typeof invoke>;

// Setup mock responses helper
export const setupMockResponses = () => {
  mockInvoke.mockImplementation((command: string): Promise<any> => {
    switch (command) {
      case "get_all_students":
        return Promise.resolve(mockStudents);
      case "get_attendance_history":
        return Promise.resolve(mockAttendanceRecords);
      case "record_attendance":
        return Promise.resolve({
          success: true,
          message: "تم تسجيل الحضور بنجاح",
          student_name: "أحمد محمد علي",
        } as AttendanceResponse);
      case "add_student":
        return Promise.resolve({
          success: true,
          student: { ...mockStudents[0], id: "STU004" },
        } as AddStudentResponse);
      case "update_student":
        return Promise.resolve({ success: true } as DefaultResponse);
      case "delete_student":
        return Promise.resolve({ success: true } as DefaultResponse);
      default:
        return Promise.resolve({ success: true } as DefaultResponse);
    }
  });
};

// Setup error responses for testing error scenarios
export const setupErrorResponses = () => {
  mockInvoke.mockRejectedValue(new Error("Network error"));
};

export { mockInvoke };
