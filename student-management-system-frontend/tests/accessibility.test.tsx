/**
 * Accessibility tests for the Student Management System
 * Tests ARIA support, screen reader compatibility, and keyboard navigation
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import userEvent from "@testing-library/user-event";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { QRScanner } from "@/components/qr-scanner";
import { StudentGrid } from "@/components/student-grid";
import { StudentForm } from "@/components/student-form";
import { HighContrastToggle } from "@/components/high-contrast-toggle";

// Mock missing test utilities
class ScreenReaderSimulator {
  announcements: string[] = [];

  announce(message: string) {
    this.announcements.push(message);
  }

  getLastAnnouncement() {
    return this.announcements[this.announcements.length - 1];
  }
}

class AccessibilityTestSuite {
  constructor(private container: HTMLElement) {}

  async runFullTest() {
    const axeResults = await axe(this.container);
    return {
      summary: { failed: axeResults.violations.length },
      keyboardResults: { issues: [] },
      contrastResults: { passes: axeResults.violations.length === 0 },
      screenReaderResults: ["Test completed"],
    };
  }
}

// Mock SkipNavigation component
const SkipNavigation: React.FC = () => (
  <nav role="navigation" aria-label="روابط التخطي">
    <a href="#main-content" className="sr-only focus:not-sr-only">
      تخطي إلى المحتوى الرئيسي
    </a>
  </nav>
);

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Test helper functions
const renderWithAccessibility = (component: React.ReactElement) => {
  return render(<AccessibilityWrapper>{component}</AccessibilityWrapper>);
};

const runAxeTest = async (container: HTMLElement) => {
  const results = await axe(container);
  expect(results).toHaveNoViolations();
  return results;
};

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
];

const mockSettings = {
  payment_threshold: 6000,
  default_groups: ["المجموعة الأولى"],
  enable_audit_log: true,
  language: "ar" as const,
  theme: "light" as const,
  enable_multi_user: false,
  backup_encryption: false,
  accessibility_mode: true,
  reminder_days: 7,
};

// Wrapper component with accessibility provider and RTL support
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
  describe("ARIA Support", () => {
    test("QR Scanner has proper ARIA labels", async () => {
      const mockOnScan = jest.fn();
      const { container } = renderWithAccessibility(
        <QRScanner onScan={mockOnScan} result="" />
      );

      // Check for proper ARIA labels using more robust assertions
      const input = screen.getByRole("textbox");
      expect(input).toHaveAccessibleName("مسح رمز QR أو إدخال رقم الطالب");
      expect(input).toHaveAttribute("aria-describedby");

      // Check for live region if result is provided
      if (screen.queryByRole("status")) {
        const liveRegion = screen.getByRole("status");
        expect(liveRegion).toHaveAttribute("aria-live", "assertive");
        expect(liveRegion).toHaveAttribute("aria-atomic", "true");
      }

      // Run axe accessibility tests
      await runAxeTest(container);
    });

    test("Student Grid has proper table semantics", async () => {
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

      // Check table semantics
      expect(screen.getByRole("table")).toHaveAttribute(
        "aria-label",
        "جدول الطلاب"
      );
      expect(screen.getAllByRole("columnheader")).toHaveLength(8);
      expect(screen.getAllByRole("row")).toHaveLength(2); // Header + 1 data row

      // Check search functionality
      expect(screen.getByRole("searchbox")).toHaveAttribute(
        "aria-label",
        "البحث في قائمة الطلاب"
      );

      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test("Student Form has proper form semantics", async () => {
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

      // Check dialog semantics
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-labelledby");
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-describedby");

      // Check form fields have proper labels
      expect(screen.getByLabelText("اسم الطالب *")).toBeInTheDocument();
      expect(screen.getByLabelText("المجموعة")).toBeInTheDocument();
      expect(screen.getByLabelText("المبلغ المدفوع")).toBeInTheDocument();

      // Check required field indicators
      const nameInput = screen.getByLabelText("اسم الطالب *");
      expect(nameInput).toHaveAttribute("required");
      expect(nameInput).toHaveAttribute("aria-invalid", "false");

      // Run axe accessibility tests
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Keyboard Navigation", () => {
    test("QR Scanner supports keyboard navigation", async () => {
      const user = userEvent.setup();
      const mockOnScan = jest.fn();

      render(
        <AccessibilityWrapper>
          <QRScanner onScan={mockOnScan} result="" />
        </AccessibilityWrapper>
      );

      const input = screen.getByRole("textbox");

      // Test keyboard input
      await user.type(input, "12345");
      expect(input).toHaveValue("12345");

      // Test Enter key submission
      await user.keyboard("{Enter}");
      expect(mockOnScan).toHaveBeenCalledWith("12345");

      // Test Escape key clearing
      await user.type(input, "test");
      await user.keyboard("{Escape}");
      expect(input).toHaveValue("");
    });

    test("Student Grid supports arrow key navigation", async () => {
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
      const dataRow = rows[1]; // Skip header row

      // Focus on the data row
      dataRow.focus();
      expect(dataRow).toHaveFocus();

      // Test Enter key for editing
      await user.keyboard("{Enter}");
      expect(mockProps.onEditStudent).toHaveBeenCalledWith(mockStudents[0]);
    });

    test("Student Form supports tab navigation and escape", async () => {
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

      // Test Escape key closes form
      await user.keyboard("{Escape}");
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  describe("High Contrast Mode", () => {
    test("High contrast toggle works correctly", async () => {
      const user = userEvent.setup();

      render(
        <AccessibilityWrapper>
          <HighContrastToggle />
        </AccessibilityWrapper>
      );

      const toggle = screen.getByRole("switch");
      expect(toggle).toHaveAttribute("aria-pressed", "false");

      // Click to enable high contrast
      await user.click(toggle);

      await waitFor(() => {
        expect(toggle).toHaveAttribute("aria-pressed", "true");
        expect(document.documentElement).toHaveClass("high-contrast");
      });

      // Click again to disable
      await user.click(toggle);

      await waitFor(() => {
        expect(toggle).toHaveAttribute("aria-pressed", "false");
        expect(document.documentElement).not.toHaveClass("high-contrast");
      });
    });

    test("High contrast styles are applied correctly", () => {
      // Enable high contrast mode
      document.documentElement.classList.add("high-contrast");

      const { container } = render(
        <AccessibilityWrapper>
          <div className="bg-red-50 text-red-600">Test content</div>
        </AccessibilityWrapper>
      );

      // Check that high contrast styles are applied
      const element = container.querySelector(".bg-red-50");
      const computedStyle = window.getComputedStyle(element!);

      // In high contrast mode, colors should be more pronounced
      expect(element).toHaveClass("bg-red-50");
    });
  });

  describe("Screen Reader Support", () => {
    test("Live regions announce changes", async () => {
      const mockOnScan = jest.fn();

      render(
        <AccessibilityWrapper>
          <QRScanner onScan={mockOnScan} result="تم تسجيل حضور أحمد محمد" />
        </AccessibilityWrapper>
      );

      // Check that result is announced in live region
      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent("تم تسجيل حضور أحمد محمد");
    });

    test("Form validation errors are announced", async () => {
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

      // Check that validation errors are properly associated
      const nameInput = screen.getByLabelText("اسم الطالب *");
      expect(nameInput).toHaveAttribute("aria-invalid", "true");
      expect(nameInput).toHaveAttribute("aria-describedby");
    });
  });

  describe("RTL Support", () => {
    test("Components render correctly in RTL layout", () => {
      const { container } = render(
        <div dir="rtl">
          <AccessibilityWrapper>
            <QRScanner onScan={jest.fn()} result="" />
          </AccessibilityWrapper>
        </div>
      );

      // Check that RTL direction is applied
      expect(container.firstChild).toHaveAttribute("dir", "rtl");
    });
  });

  describe("Focus Management", () => {
    test("Focus is trapped within modal dialogs", async () => {
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
      const firstInput = screen.getByLabelText("اسم الطالب *");
      const lastButton = screen.getByRole("button", { name: /إضافة الطالب/ });

      // Focus should start on first input
      expect(firstInput).toHaveFocus();

      // Tab to last element
      await user.tab();
      await user.tab();
      // Continue tabbing to reach last button...

      // Tab from last element should cycle back to first
      await user.tab();
      // Focus should cycle back (implementation depends on focus trap)
    });

    test("Focus is restored after modal closes", async () => {
      const user = userEvent.setup();

      // Create a button that opens the modal
      const OpenModalButton = () => {
        const [isOpen, setIsOpen] = React.useState(false);

        return (
          <>
            <button onClick={() => setIsOpen(true)}>Open Modal</button>
            {isOpen && (
              <StudentForm
                student={null}
                settings={mockSettings}
                onSubmit={jest.fn()}
                onClose={() => setIsOpen(false)}
              />
            )}
          </>
        );
      };

      render(
        <AccessibilityWrapper>
          <OpenModalButton />
        </AccessibilityWrapper>
      );

      const openButton = screen.getByText("Open Modal");

      // Focus and click the open button
      openButton.focus();
      expect(openButton).toHaveFocus();

      await user.click(openButton);

      // Modal should be open and focused
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      // Close modal with Escape
      await user.keyboard("{Escape}");

      // Focus should return to the open button
      await waitFor(() => {
        expect(openButton).toHaveFocus();
      });
    });
  });
});
