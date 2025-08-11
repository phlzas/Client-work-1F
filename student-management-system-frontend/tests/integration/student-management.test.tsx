import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import type { Student } from "@/types";

// Test utilities and mocks
import { render, testAccessibility } from "../utils/test-utils";
import { mockStudents } from "../mocks/mock-data";
import {
  MockQRScanner,
  MockStudentGrid,
  MockStudentForm,
  type MockQRScannerProps,
  type MockStudentGridProps,
  type MockStudentFormProps,
  type StudentFormData,
} from "../mocks/mock-components";
import {
  setupMockResponses,
  setupErrorResponses,
  mockInvoke,
  type AttendanceResponse,
  type AddStudentResponse,
  type DefaultResponse,
} from "../mocks/mock-api";

// Mock Tauri API
jest.mock("@tauri-apps/api/core", () => ({
  invoke: jest.fn(),
}));

// Mock hooks
jest.mock("@/hooks/useGroups", () => ({
  useGroups: () => ({
    groups: [
      { id: 1, name: "المجموعة الأولى" },
      { id: 2, name: "المجموعة الثانية" },
    ],
    loading: false,
    error: null,
  }),
}));

jest.mock("@/hooks/usePaymentSettings", () => ({
  usePaymentSettings: () => ({
    settings: {
      one_time_amount: 6000,
      monthly_amount: 850,
      installment_amount: 2850,
      installment_interval_months: 3,
    },
    loading: false,
    error: null,
  }),
}));

// Mock data transform utilities
jest.mock("@/lib/data-transform", () => ({
  transformStudentData: (students: Student[]) => students,
  getPaymentStatusText: (status: string) => {
    const statusMap: Record<string, string> = {
      paid: "مدفوع",
      pending: "في الانتظار",
      overdue: "متأخر",
      due_soon: "مستحق قريباً",
    };
    return statusMap[status] || "غير محدد";
  },
  getPaymentStatusColor: (status: string) => {
    const colorMap: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
      due_soon: "bg-orange-100 text-orange-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  },
  getPaymentPlanText: (plan: string) => {
    const planMap: Record<string, string> = {
      "one-time": "دفعة واحدة",
      monthly: "شهري",
      installment: "أقساط",
    };
    return planMap[plan] || plan;
  },
  formatCurrency: (amount: number) => `${amount.toLocaleString()} ج.م`,
}));

describe("Student Management Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMockResponses();
  });

  describe("QR Scanner Component", () => {
    it("should render with accessibility compliance", async () => {
      const mockOnScan = jest.fn();

      const { container } = render(
        <MockQRScanner onScan={mockOnScan} result="" />
      );

      // Check accessibility
      await testAccessibility(container);

      // Check basic rendering
      expect(
        screen.getByRole("textbox", { name: /مسح رمز QR أو إدخال رقم الطالب/i })
      ).toBeInTheDocument();
    });

    it("should handle QR code scanning workflow", async () => {
      const user = userEvent.setup();
      const mockOnScan = jest.fn();

      render(<MockQRScanner onScan={mockOnScan} result="" />);

      const input = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/i,
      });

      // Type student ID
      await user.type(input, "STU001");
      expect(input).toHaveValue("STU001");

      // Press Enter to scan
      await user.keyboard("{Enter}");
      expect(mockOnScan).toHaveBeenCalledWith("STU001");

      // Input should be cleared after scan
      await waitFor(() => {
        expect(input).toHaveValue("");
      });
    });

    it("should display scan results with payment status", () => {
      const mockOnScan = jest.fn();

      render(
        <MockQRScanner
          onScan={mockOnScan}
          result="تم تسجيل حضور أحمد محمد علي - الحالة: مدفوع"
        />
      );

      expect(
        screen.getByText(/تم تسجيل حضور أحمد محمد علي/)
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should handle invalid student ID error", () => {
      const mockOnScan = jest.fn();

      render(
        <MockQRScanner onScan={mockOnScan} result="خطأ: الطالب غير موجود" />
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveClass("border-red-200", "bg-red-50");
      expect(screen.getByText("خطأ: الطالب غير موجود")).toBeInTheDocument();
    });
  });

  describe("Student Form Integration", () => {
    it("should render student form with accessibility", async () => {
      const mockOnSubmit = jest.fn();
      const mockOnCancel = jest.fn();

      const { container } = render(
        <MockStudentForm
          isOpen={true}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          student={null}
        />
      );

      // Check accessibility
      await testAccessibility(container);

      // Check form fields
      expect(screen.getByLabelText(/اسم الطالب/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/المجموعة/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/خطة الدفع/i)).toBeInTheDocument();
    });

    it("should handle student creation workflow", async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn();
      const mockOnCancel = jest.fn();

      render(
        <MockStudentForm
          isOpen={true}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          student={null}
        />
      );

      // Fill form fields
      await user.type(screen.getByLabelText(/اسم الطالب/i), "طالب جديد");
      await user.selectOptions(
        screen.getByLabelText(/المجموعة/i),
        "المجموعة الأولى"
      );
      await user.selectOptions(screen.getByLabelText(/خطة الدفع/i), "one-time");

      // Submit form
      await user.click(screen.getByRole("button", { name: /إضافة الطالب/i }));

      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "طالب جديد",
          group_name: "المجموعة الأولى",
          payment_plan: "one-time",
        })
      );
    });
  });

  describe("Student Grid Integration", () => {
    it("should render student grid with data", () => {
      const mockHandlers = {
        onEditStudent: jest.fn(),
        onDeleteStudent: jest.fn(),
        onAddStudent: jest.fn(),
      };

      render(<MockStudentGrid students={mockStudents} {...mockHandlers} />);

      // Check if students are displayed
      expect(screen.getByText("أحمد محمد علي")).toBeInTheDocument();
      expect(screen.getByText("فاطمة أحمد")).toBeInTheDocument();
      expect(screen.getByText("محمد سالم")).toBeInTheDocument();

      // Check controls
      expect(screen.getByText("إضافة طالب جديد")).toBeInTheDocument();
      expect(screen.getByRole("searchbox")).toBeInTheDocument();
    });

    it("should handle filtering functionality", async () => {
      const user = userEvent.setup();
      const mockHandlers = {
        onEditStudent: jest.fn(),
        onDeleteStudent: jest.fn(),
        onAddStudent: jest.fn(),
      };

      render(<MockStudentGrid students={mockStudents} {...mockHandlers} />);

      // Test search functionality
      const searchInput = screen.getByRole("searchbox");
      await user.type(searchInput, "أحمد");
      expect(searchInput).toHaveValue("أحمد");

      // Test status filtering
      const statusFilter = screen.getByDisplayValue("جميع الحالات");
      await user.selectOptions(statusFilter, "overdue");
      expect(statusFilter).toHaveValue("overdue");

      // Test group filtering
      const groupFilter = screen.getByDisplayValue("جميع المجموعات");
      await user.selectOptions(groupFilter, "المجموعة الأولى");
      expect(groupFilter).toHaveValue("المجموعة الأولى");
    });
  });

  describe("Full Integration Workflow", () => {
    // Integration test component that combines multiple components
    const StudentManagementApp: React.FC = () => {
      const [students, setStudents] = React.useState<Student[]>(mockStudents);
      const [selectedStudent, setSelectedStudent] =
        React.useState<Student | null>(null);
      const [showForm, setShowForm] = React.useState(false);
      const [scanResult, setScanResult] = React.useState("");

      const handleScan = async (studentId: string) => {
        try {
          const result = (await invoke("record_attendance", {
            student_id: studentId,
          })) as AttendanceResponse;
          if (result.success) {
            setScanResult(`تم تسجيل حضور ${result.student_name}`);
          } else {
            setScanResult("الطالب غير موجود");
          }
        } catch (error) {
          setScanResult("خطأ في تسجيل الحضور");
        }
      };

      const handleEditStudent = (student: Student) => {
        setSelectedStudent(student);
        setShowForm(true);
      };

      const handleDeleteStudent = async (student: Student) => {
        try {
          (await invoke("delete_student", {
            student_id: student.id,
          })) as DefaultResponse;
          setStudents((prev) => prev.filter((s) => s.id !== student.id));
        } catch (error) {
          console.error("Failed to delete student:", error);
        }
      };

      const handleAddStudent = () => {
        setSelectedStudent(null);
        setShowForm(true);
      };

      const handleSubmitStudent = async (studentData: StudentFormData) => {
        try {
          if (selectedStudent) {
            // Update existing student
            const result = (await invoke("update_student", {
              student_id: selectedStudent.id,
              student_data: studentData,
            })) as DefaultResponse;
            if (result.success) {
              setStudents((prev) =>
                prev.map((s) =>
                  s.id === selectedStudent.id ? { ...s, ...studentData } : s
                )
              );
            }
          } else {
            // Add new student
            const result = (await invoke("add_student", {
              student_data: studentData,
            })) as AddStudentResponse;
            if (result.success) {
              setStudents((prev) => [...prev, result.student]);
            }
          }
          setShowForm(false);
          setSelectedStudent(null);
        } catch (error) {
          console.error("Failed to save student:", error);
        }
      };

      const handleCloseForm = () => {
        setShowForm(false);
        setSelectedStudent(null);
      };

      return (
        <div className="space-y-6">
          <MockQRScanner onScan={handleScan} result={scanResult} />
          <MockStudentGrid
            students={students}
            onEditStudent={handleEditStudent}
            onDeleteStudent={handleDeleteStudent}
            onAddStudent={handleAddStudent}
          />
          <MockStudentForm
            isOpen={showForm}
            student={selectedStudent}
            onSubmit={handleSubmitStudent}
            onClose={handleCloseForm}
          />
        </div>
      );
    };

    it("completes full student management workflow", async () => {
      const user = userEvent.setup();

      render(<StudentManagementApp />);

      // Verify initial state
      expect(screen.getByTestId("qr-scanner")).toBeInTheDocument();
      expect(screen.getByTestId("student-grid")).toBeInTheDocument();
      expect(screen.getByText("أحمد محمد علي")).toBeInTheDocument();
      expect(screen.getByText("فاطمة أحمد")).toBeInTheDocument();

      // Test QR scanning
      const qrInput = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/,
      });
      await user.type(qrInput, "STU001");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(
          screen.getByText("تم تسجيل حضور أحمد محمد علي")
        ).toBeInTheDocument();
      });

      // Test adding new student
      const addButton = screen.getByText("إضافة طالب جديد");
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId("student-form")).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText("اسم الطالب *");
      await user.type(nameInput, "محمد علي");

      const groupSelect = screen.getByLabelText("المجموعة");
      await user.selectOptions(groupSelect, "المجموعة الأولى");

      const submitButton = screen.getByText("إضافة الطالب");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getAllByRole("row")).toHaveLength(4); // Header + 3 data rows
      });
    });

    it("handles error scenarios gracefully", async () => {
      const user = userEvent.setup();

      // Mock network error
      mockInvoke.mockRejectedValue(new Error("Network error"));

      render(<StudentManagementApp />);

      const qrInput = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/i,
      });
      await user.type(qrInput, "INVALID");
      await user.keyboard("{Enter}");

      await waitFor(() => {
        expect(screen.getByText("خطأ في تسجيل الحضور")).toBeInTheDocument();
      });
    });
  });
});
