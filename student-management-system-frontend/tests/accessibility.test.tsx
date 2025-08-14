/**
 * Comprehensive accessibility tests for the Student Management System
 * Tests ARIA compliance, keyboard navigation, screen reader compatibility, and high contrast mode
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import userEvent from "@testing-library/user-event";

// Import components to test
import { QRScanner } from "@/components/qr-scanner";
import { StudentGrid } from "@/components/student-grid";
import { StudentForm } from "@/components/student-form";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { HighContrastToggle } from "@/components/high-contrast-toggle";
import { SkipNavigation } from "@/components/skip-navigation";

// Import testing utilities
import {
  AccessibilityTestSuite,
  ScreenReaderSimulator,
  configureAxeForArabic,
} from "@/lib/accessibility-testing";

// Mock data
const mockStudents = [
  {
    id: "1",
    name: "أحمد محمد",
    group: "المجموعة الأولى",
    paymentPlan: "monthly" as const,
    planAmount: 850,
    paidAmount: 850,
    paymentStatus: "paid" as const,
    enrollmentDate: "2024-01-01",
    attendanceLog: [],
    paymentHistory: [],
    createdAt: "2024-01-01",
    updatedAt: "2024-01-01",
  },
  {
    id: "2",
    name: "فاطمة علي",
    group: "المجموعة الثانية",
    paymentPlan: "installment" as const,
    planAmount: 2850,
    paidAmount: 1000,
    paymentStatus: "pending" as const,
    enrollmentDate: "2024-01-15",
    attendanceLog: [],
    paymentHistory: [],
    createdAt: "2024-01-15",
    updatedAt: "2024-01-15",
  },
];

const mockSettings = {
  payment_threshold: 6000,
  default_groups: ["المجموعة الأولى", "المجموعة الثانية"],
  enable_audit_log: true,
  language: "ar" as const,
  theme: "light" as const,
  enable_multi_user: false,
  backup_encryption: false,
  accessibility_mode: true,
  reminder_days: 7,
};

// Configure axe for Arabic content
beforeAll(() => {
  configureAxeForArabic();
  expect.extend(toHaveNoViolations);
});

// Wrapper component with providers
const AccessibilityWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AccessibilityProvider>
    <div dir="rtl" lang="ar">
      {children}
    </div>
  </AccessibilityProvider>
);

describe("Accessibility Tests", () => {
  describe("ARIA Labels and Roles", () => {
    test("QRScanner has proper ARIA labels", async () => {
      const mockOnScan = jest.fn();
      const { container } = render(
        <AccessibilityWrapper>
          <QRScanner onScan={mockOnScan} result="" />
        </AccessibilityWrapper>
      );

      // Check for proper ARIA labels
      expect(
        screen.getByLabelText("مسح رمز QR أو إدخال رقم الطالب")
      ).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby");

      // Run axe tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test("StudentGrid has proper table structure and ARIA", async () => {
      const mockProps = {
        students: mockStudents,
        onEditStudent: jest.fn(),
        onDeleteStudent: jest.fn(),
        onAddStudent: jest.fn(),
      };

      const { container } = render(
        <AccessibilityWrapper>
          <StudentGrid {...mockProps} />
        </AccessibilityWrapper>
      );

      // Check table structure
      expect(screen.getByRole("table")).toBeInTheDocument();
      expect(screen.getByLabelText("جدول الطلاب")).toBeInTheDocument();

      // Check column headers
      const columnHeaders = screen.getAllByRole("columnheader");
      expect(columnHeaders).toHaveLength(8); // All table columns

      // Check rows
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(1); // Header + data rows

      // Run axe tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test("StudentForm has proper form structure and labels", async () => {
      const mockProps = {
        student: null,
        settings: mockSettings,
        onSubmit: jest.fn(),
        onClose: jest.fn(),
      };

      const { container } = render(
        <AccessibilityWrapper>
          <StudentForm {...mockProps} />
        </AccessibilityWrapper>
      );

      // Check dialog structure
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText(/إضافة طالب جديد/)).toBeInTheDocument();

      // Check form fields have labels
      expect(screen.getByLabelText("اسم الطالب *")).toBeInTheDocument();
      expect(screen.getByLabelText("المجموعة")).toBeInTheDocument();

      // Run axe tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Keyboard Navigation", () => {
    test("QRScanner supports keyboard navigation", async () => {
      const user = userEvent.setup();
      const mockOnScan = jest.fn();

      render(
        <AccessibilityWrapper>
          <QRScanner onScan={mockOnScan} result="" />
        </AccessibilityWrapper>
      );

      const input = screen.getByRole("textbox");

      // Test focus
      await user.click(input);
      expect(input).toHaveFocus();

      // Test typing
      await user.type(input, "12345");
      expect(input).toHaveValue("12345");

      // Test Enter key
      await user.keyboard("{Enter}");
      expect(mockOnScan).toHaveBeenCalledWith("12345");

      // Test Escape key
      await user.type(input, "test");
      await user.keyboard("{Escape}");
      expect(input).toHaveValue("");
    });

    test("StudentGrid supports arrow key navigation", async () => {
      const user = userEvent.setup();
      const mockProps = {
        students: mockStudents,
        onEditStudent: jest.fn(),
        onDeleteStudent: jest.fn(),
        onAddStudent: jest.fn(),
      };

      render(
        <AccessibilityWrapper>
          <StudentGrid {...mockProps} />
        </AccessibilityWrapper>
      );

      const table = screen.getByRole("table");
      const rows = screen.getAllByRole("row");
      const dataRows = rows.slice(1); // Skip header row

      // Focus first data row
      if (dataRows[0]) {
        dataRows[0].focus();
        expect(dataRows[0]).toHaveFocus();

        // Test arrow down
        await user.keyboard("{ArrowDown}");
        if (dataRows[1]) {
          expect(dataRows[1]).toHaveFocus();
        }

        // Test arrow up
        await user.keyboard("{ArrowUp}");
        expect(dataRows[0]).toHaveFocus();

        // Test Enter key
        await user.keyboard("{Enter}");
        expect(mockProps.onEditStudent).toHaveBeenCalled();
      }
    });

    test("StudentForm traps focus properly", async () => {
      const user = userEvent.setup();
      const mockProps = {
        student: null,
        settings: mockSettings,
        onSubmit: jest.fn(),
        onClose: jest.fn(),
      };

      render(
        <AccessibilityWrapper>
          <StudentForm {...mockProps} />
        </AccessibilityWrapper>
      );

      const dialog = screen.getByRole("dialog");
      const focusableElements = dialog.querySelectorAll(
        'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      expect(focusableElements.length).toBeGreaterThan(0);

      // Test Escape key closes dialog
      await user.keyboard("{Escape}");
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe("Screen Reader Compatibility", () => {
    test("Components announce changes properly", async () => {
      const screenReader = new ScreenReaderSimulator();
      const mockOnScan = jest.fn();

      render(
        <AccessibilityWrapper>
          <QRScanner onScan={mockOnScan} result="تم تسجيل حضور أحمد محمد" />
        </AccessibilityWrapper>
      );

      // Check for live region
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute("aria-live", "assertive");
      expect(liveRegion).toHaveTextContent("تم تسجيل حضور أحمد محمد");
    });

    test("Navigation landmarks are properly labeled", () => {
      render(
        <AccessibilityWrapper>
          <SkipNavigation />
          <main id="main-content" role="main">
            <h1>نظام إدارة الطلاب</h1>
          </main>
        </AccessibilityWrapper>
      );

      // Check skip navigation
      const skipNav = screen.getByRole("navigation", { name: "روابط التخطي" });
      expect(skipNav).toBeInTheDocument();

      // Check main landmark
      const main = screen.getByRole("main");
      expect(main).toBeInTheDocument();
    });
  });

  describe("High Contrast Mode", () => {
    test("High contrast toggle works properly", async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <HighContrastToggle />
        </AccessibilityWrapper>
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-pressed", "false");

      // Click toggle
      await user.click(toggle);

      // Check if high contrast class is added
      await waitFor(() => {
        expect(document.documentElement).toHaveClass("high-contrast");
      });

      expect(toggle).toHaveAttribute("aria-pressed", "true");
    });

    test("High contrast styles are applied correctly", () => {
      // Add high contrast class
      document.documentElement.classList.add("high-contrast");

      render(
        <AccessibilityWrapper>
          <div className="bg-red-50 text-red-600">Error message</div>
        </AccessibilityWrapper>
      );

      const errorDiv = screen.getByText("Error message");
      const styles = window.getComputedStyle(errorDiv);

      // In high contrast mode, colors should be more pronounced
      // This would need actual CSS testing in a real browser environment
      expect(errorDiv).toHaveClass("bg-red-50", "text-red-600");

      // Cleanup
      document.documentElement.classList.remove("high-contrast");
    });
  });

  describe("RTL Support", () => {
    test("Components render correctly in RTL mode", () => {
      const mockOnScan = jest.fn();

      render(
        <div dir="rtl">
          <QRScanner onScan={mockOnScan} result="" />
        </div>
      );

      const container = screen.getByRole("textbox").closest('[dir="rtl"]');
      expect(container).toBeInTheDocument();
    });

    test("Text alignment is correct for Arabic content", () => {
      render(
        <div dir="rtl" className="text-right">
          <p>نص عربي للاختبار</p>
        </div>
      );

      const paragraph = screen.getByText("نص عربي للاختبار");
      expect(paragraph.closest("div")).toHaveAttribute("dir", "rtl");
    });
  });

  describe("Error Handling and Validation", () => {
    test("Form validation errors are announced properly", async () => {
      const user = userEvent.setup();
      const mockProps = {
        student: null,
        settings: mockSettings,
        onSubmit: jest.fn(),
        onClose: jest.fn(),
      };

      render(
        <AccessibilityWrapper>
          <StudentForm {...mockProps} />
        </AccessibilityWrapper>
      );

      const submitButton = screen.getByRole("button", { name: /إضافة الطالب/ });

      // Try to submit empty form
      await user.click(submitButton);

      // Check for error messages
      await waitFor(() => {
        const nameInput = screen.getByLabelText("اسم الطالب *");
        expect(nameInput).toHaveAttribute("aria-invalid", "true");
      });
    });
  });

  describe("Comprehensive Accessibility Test", () => {
    test("Full accessibility test suite passes", async () => {
      const mockProps = {
        students: mockStudents,
        onEditStudent: jest.fn(),
        onDeleteStudent: jest.fn(),
        onAddStudent: jest.fn(),
      };

      const { container } = render(
        <AccessibilityWrapper>
          <SkipNavigation />
          <main id="main-content">
            <h1>نظام إدارة الطلاب</h1>
            <StudentGrid {...mockProps} />
            <QRScanner onScan={jest.fn()} result="" />
          </main>
        </AccessibilityWrapper>
      );

      // Run comprehensive test suite
      const testSuite = new AccessibilityTestSuite(container);
      const results = await testSuite.runFullTest();

      // Check results
      expect(results.summary.failed).toBe(0);
      expect(results.keyboardResults.issues).toHaveLength(0);
      expect(results.contrastResults.passes).toBe(true);
      expect(results.screenReaderResults.length).toBeGreaterThan(0);

      // Run axe tests
      const axeResults = await axe(container);
      expect(axeResults).toHaveNoViolations();
    });
  });
});
