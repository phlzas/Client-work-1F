import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QRScanner } from "@/components/qr-scanner";
import { StudentGrid } from "@/components/student-grid";
import { StudentForm } from "@/components/student-form";
import { AppSidebar } from "@/components/app-sidebar";
import { KeyboardNavigationProvider } from "@/components/keyboard-navigation-provider";
import type { Student, AppSettings } from "@/types";

// Mock data
const mockStudents: Student[] = [
  {
    id: "STU001",
    name: "أحمد محمد",
    group: "المجموعة الأولى",
    paymentPlan: "one-time",
    planAmount: 6000,
    paidAmount: 6000,
    paymentStatus: "paid",
    enrollmentDate: "2024-01-01",
    attendanceLog: [],
    paymentHistory: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "STU002",
    name: "فاطمة علي",
    group: "المجموعة الثانية",
    paymentPlan: "monthly",
    planAmount: 850,
    paidAmount: 0,
    paymentStatus: "overdue",
    enrollmentDate: "2024-01-01",
    attendanceLog: [],
    paymentHistory: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
];

const mockSettings: AppSettings = {
  payment_threshold: 6000,
  default_groups: ["المجموعة الأولى", "المجموعة الثانية"],
  enable_audit_log: true,
  language: "ar",
  theme: "light",
  enable_multi_user: false,
  backup_encryption: false,
  accessibility_mode: true,
  reminder_days: 7,
};

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
      reminder_days: 7,
      payment_threshold: 6000,
    },
    loading: false,
    error: null,
  }),
}));

describe("Keyboard Navigation", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset any global state
    document.body.classList.remove("keyboard-user");
  });

  describe("QRScanner Component", () => {
    it("should focus input field automatically", () => {
      const mockOnScan = jest.fn();
      render(
        <KeyboardNavigationProvider>
          <QRScanner onScan={mockOnScan} result="" />
        </KeyboardNavigationProvider>
      );

      const input = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/,
      });
      expect(input).toHaveFocus();
    });

    it("should handle Enter key to submit scan", async () => {
      const mockOnScan = jest.fn();
      render(
        <KeyboardNavigationProvider>
          <QRScanner onScan={mockOnScan} result="" />
        </KeyboardNavigationProvider>
      );

      const input = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/,
      });

      await user.type(input, "STU001");
      await user.keyboard("{Enter}");

      expect(mockOnScan).toHaveBeenCalledWith("STU001");
    });

    it("should handle Escape key to clear input", async () => {
      const mockOnScan = jest.fn();
      render(
        <KeyboardNavigationProvider>
          <QRScanner onScan={mockOnScan} result="" />
        </KeyboardNavigationProvider>
      );

      const input = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/,
      });

      await user.type(input, "STU001");
      expect(input).toHaveValue("STU001");

      await user.keyboard("{Escape}");
      expect(input).toHaveValue("");
    });

    it("should maintain focus after blur", async () => {
      const mockOnScan = jest.fn();
      render(
        <KeyboardNavigationProvider>
          <QRScanner onScan={mockOnScan} result="" />
          <button>Other Element</button>
        </KeyboardNavigationProvider>
      );

      const input = screen.getByRole("textbox", {
        name: /مسح رمز QR أو إدخال رقم الطالب/,
      });
      const button = screen.getByRole("button", { name: /Other Element/ });

      // Try to focus another element
      button.focus();

      // Wait for refocus mechanism
      await waitFor(
        () => {
          expect(input).toHaveFocus();
        },
        { timeout: 200 }
      );
    });
  });

  describe("StudentGrid Component", () => {
    it("should support arrow key navigation", async () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnAdd = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentGrid
            students={mockStudents}
            onEditStudent={mockOnEdit}
            onDeleteStudent={mockOnDelete}
            onAddStudent={mockOnAdd}
          />
        </KeyboardNavigationProvider>
      );

      const table = screen.getByRole("table");
      table.focus();

      // Navigate down with arrow keys
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Check if second row is selected (visual indication)
      const rows = screen.getAllByRole("row");
      expect(rows[2]).toHaveClass("ring-2", "ring-blue-500");
    });

    it("should handle Enter key to edit selected student", async () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnAdd = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentGrid
            students={mockStudents}
            onEditStudent={mockOnEdit}
            onDeleteStudent={mockOnDelete}
            onAddStudent={mockOnAdd}
          />
        </KeyboardNavigationProvider>
      );

      const table = screen.getByRole("table");
      table.focus();

      // Navigate to first student and press Enter
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");

      expect(mockOnEdit).toHaveBeenCalledWith(mockStudents[0]);
    });

    it("should handle Escape key to clear selection", async () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnAdd = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentGrid
            students={mockStudents}
            onEditStudent={mockOnEdit}
            onDeleteStudent={mockOnDelete}
            onAddStudent={mockOnAdd}
          />
        </KeyboardNavigationProvider>
      );

      const table = screen.getByRole("table");
      table.focus();

      // Navigate to select a row
      await user.keyboard("{ArrowDown}");

      // Clear selection with Escape
      await user.keyboard("{Escape}");

      // Check that no row is selected
      const rows = screen.getAllByRole("row");
      rows.forEach((row) => {
        expect(row).not.toHaveClass("ring-2", "ring-blue-500");
      });
    });

    it("should support search functionality with keyboard", async () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnAdd = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentGrid
            students={mockStudents}
            onEditStudent={mockOnEdit}
            onDeleteStudent={mockOnDelete}
            onAddStudent={mockOnAdd}
          />
        </KeyboardNavigationProvider>
      );

      const searchInput = screen.getByRole("searchbox");

      await user.type(searchInput, "أحمد");

      // Should filter results
      expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
      expect(screen.queryByText("فاطمة علي")).not.toBeInTheDocument();
    });
  });

  describe("StudentForm Component", () => {
    it("should trap focus within modal", async () => {
      const mockOnSubmit = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentForm
            student={null}
            settings={mockSettings}
            onSubmit={mockOnSubmit}
            onClose={mockOnClose}
          />
        </KeyboardNavigationProvider>
      );

      const nameInput = screen.getByLabelText(/اسم الطالب/);
      const cancelButton = screen.getByRole("button", { name: /إلغاء/ });
      const submitButton = screen.getByRole("button", { name: /إضافة الطالب/ });

      // Focus should start on name input
      expect(nameInput).toHaveFocus();

      // Tab through form elements
      await user.keyboard("{Tab}"); // Group select
      await user.keyboard("{Tab}"); // Payment plan select
      await user.keyboard("{Tab}"); // Plan amount
      await user.keyboard("{Tab}"); // Paid amount
      await user.keyboard("{Tab}"); // Enrollment date
      await user.keyboard("{Tab}"); // Cancel button
      expect(cancelButton).toHaveFocus();

      await user.keyboard("{Tab}"); // Submit button
      expect(submitButton).toHaveFocus();

      // Tab should wrap back to first element
      await user.keyboard("{Tab}");
      expect(nameInput).toHaveFocus();
    });

    it("should handle Escape key to close modal", async () => {
      const mockOnSubmit = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentForm
            student={null}
            settings={mockSettings}
            onSubmit={mockOnSubmit}
            onClose={mockOnClose}
          />
        </KeyboardNavigationProvider>
      );

      await user.keyboard("{Escape}");
      expect(mockOnClose).toHaveBeenCalled();
    });

    it("should validate required fields with keyboard navigation", async () => {
      const mockOnSubmit = jest.fn();
      const mockOnClose = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentForm
            student={null}
            settings={mockSettings}
            onSubmit={mockOnSubmit}
            onClose={mockOnClose}
          />
        </KeyboardNavigationProvider>
      );

      const submitButton = screen.getByRole("button", { name: /إضافة الطالب/ });

      // Try to submit without filling required fields
      submitButton.focus();
      await user.keyboard("{Enter}");

      // Should show validation errors
      expect(screen.getByText(/اسم الطالب مطلوب/)).toBeInTheDocument();
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("AppSidebar Component", () => {
    it("should support arrow key navigation between menu items", async () => {
      const mockOnViewChange = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <AppSidebar
            activeView="dashboard"
            onViewChange={mockOnViewChange}
            students={mockStudents}
          />
        </KeyboardNavigationProvider>
      );

      const sidebar = screen.getByRole("navigation");
      sidebar.focus();

      // Navigate with arrow keys
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{ArrowDown}");

      // Press Enter to activate menu item
      await user.keyboard("{Enter}");

      expect(mockOnViewChange).toHaveBeenCalled();
    });

    it("should indicate current page with aria-current", () => {
      const mockOnViewChange = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <AppSidebar
            activeView="students"
            onViewChange={mockOnViewChange}
            students={mockStudents}
          />
        </KeyboardNavigationProvider>
      );

      const activeMenuItem = screen.getByRole("menuitem", { current: "page" });
      expect(activeMenuItem).toBeInTheDocument();
    });
  });

  describe("Keyboard User Detection", () => {
    it("should detect keyboard usage and add appropriate class", async () => {
      render(
        <KeyboardNavigationProvider>
          <button>Test Button</button>
        </KeyboardNavigationProvider>
      );

      // Simulate keyboard usage
      await user.keyboard("{Tab}");

      expect(document.body).toHaveClass("keyboard-user");
    });

    it("should remove keyboard user class on mouse usage", async () => {
      render(
        <KeyboardNavigationProvider>
          <button>Test Button</button>
        </KeyboardNavigationProvider>
      );

      // First use keyboard
      await user.keyboard("{Tab}");
      expect(document.body).toHaveClass("keyboard-user");

      // Then use mouse
      const button = screen.getByRole("button");
      await user.click(button);

      expect(document.body).not.toHaveClass("keyboard-user");
    });
  });

  describe("Focus Indicators", () => {
    it("should show focus indicators for keyboard users", async () => {
      render(
        <KeyboardNavigationProvider>
          <button>Test Button</button>
        </KeyboardNavigationProvider>
      );

      // Simulate keyboard usage to enable focus indicators
      await user.keyboard("{Tab}");

      const button = screen.getByRole("button");
      button.focus();

      // Check if focus indicator is visible
      const focusIndicator = document.querySelector(".focus-indicator");
      expect(focusIndicator).toBeInTheDocument();
    });
  });

  describe("Skip Links", () => {
    it("should provide skip links for keyboard navigation", () => {
      render(
        <KeyboardNavigationProvider>
          <div id="main-content">Main Content</div>
          <div id="navigation">Navigation</div>
        </KeyboardNavigationProvider>
      );

      const skipLinks = document.querySelector(".skip-links");
      expect(skipLinks).toBeInTheDocument();

      const skipToMain = screen.getByText("تخطي إلى المحتوى الرئيسي");
      const skipToNav = screen.getByText("تخطي إلى التنقل");

      expect(skipToMain).toBeInTheDocument();
      expect(skipToNav).toBeInTheDocument();
    });
  });

  describe("ARIA Labels and Roles", () => {
    it("should have proper ARIA labels on interactive elements", () => {
      const mockOnScan = jest.fn();
      render(
        <KeyboardNavigationProvider>
          <QRScanner onScan={mockOnScan} result="" />
        </KeyboardNavigationProvider>
      );

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute(
        "aria-label",
        "مسح رمز QR أو إدخال رقم الطالب"
      );
      expect(input).toHaveAttribute("aria-describedby");
    });

    it("should have proper table structure with roles", () => {
      const mockOnEdit = jest.fn();
      const mockOnDelete = jest.fn();
      const mockOnAdd = jest.fn();

      render(
        <KeyboardNavigationProvider>
          <StudentGrid
            students={mockStudents}
            onEditStudent={mockOnEdit}
            onDeleteStudent={mockOnDelete}
            onAddStudent={mockOnAdd}
          />
        </KeyboardNavigationProvider>
      );

      const table = screen.getByRole("table");
      expect(table).toHaveAttribute("aria-label", "جدول الطلاب");

      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders.length).toBeGreaterThan(0);

      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    it("should announce status changes with aria-live", async () => {
      const mockOnScan = jest.fn();
      render(
        <KeyboardNavigationProvider>
          <QRScanner onScan={mockOnScan} result="تم تسجيل الحضور بنجاح" />
        </KeyboardNavigationProvider>
      );

      const statusRegion = screen.getByRole("status");
      expect(statusRegion).toHaveAttribute("aria-live", "polite");
      expect(statusRegion).toHaveTextContent("تم تسجيل الحضور بنجاح");
    });
  });
});
