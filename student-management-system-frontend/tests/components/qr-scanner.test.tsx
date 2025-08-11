import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe, toHaveNoViolations } from "jest-axe";
import { QRScanner } from "@/components/qr-scanner";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { KeyboardNavigationProvider } from "@/components/keyboard-navigation-provider";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock hooks
jest.mock("@/hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: jest.fn(() => ({
    containerRef: { current: null },
  })),
}));

jest.mock("@/components/accessibility-provider", () => ({
  useAccessibility: jest.fn(() => ({
    announce: jest.fn(),
  })),
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/components/keyboard-navigation-provider", () => ({
  KeyboardNavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AccessibilityProvider>
    <KeyboardNavigationProvider>{children}</KeyboardNavigationProvider>
  </AccessibilityProvider>
);

describe("QRScanner Component", () => {
  const mockOnScan = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderQRScanner = (props = {}) => {
    return render(
      <TestWrapper>
        <QRScanner onScan={mockOnScan} result="" {...props} />
      </TestWrapper>
    );
  };

  describe("Component Rendering", () => {
    it("renders correctly with initial state", () => {
      renderQRScanner();

      expect(screen.getByText("مسح رمز QR للحضور")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("امسح رمز QR أو أدخل رقم الطالب...")
      ).toBeInTheDocument();
    });

    it("renders title and instructions", () => {
      renderQRScanner();

      expect(screen.getByText("مسح رمز QR للحضور")).toBeInTheDocument();
      expect(
        screen.getByText(/امسح رمز QR الخاص بالطالب أو أدخل رقم الطالب يدوياً/)
      ).toBeInTheDocument();
      expect(screen.getByText(/اضغط Enter لتسجيل الحضور/)).toBeInTheDocument();
      expect(
        screen.getByText(/اضغط Escape لمسح النص المدخل/)
      ).toBeInTheDocument();
    });

    it("displays success result when provided", () => {
      renderQRScanner({ result: "تم تسجيل حضور أحمد محمد بنجاح" });

      const alert = screen.getByTestId("alert");
      expect(alert).toHaveClass("border-green-200", "bg-green-50");
      expect(
        screen.getByText("تم تسجيل حضور أحمد محمد بنجاح")
      ).toBeInTheDocument();
    });

    it("displays error result when provided", () => {
      renderQRScanner({ result: "الطالب غير موجود في النظام" });

      const alert = screen.getByTestId("alert");
      expect(alert).toHaveClass("border-red-200", "bg-red-50");
      expect(
        screen.getByText("الطالب غير موجود في النظام")
      ).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    it("handles text input correctly", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");

      expect(input).toHaveValue("STU001");
    });

    it("calls onScan when Enter is pressed", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");
      await user.keyboard("{Enter}");

      expect(mockOnScan).toHaveBeenCalledWith("STU001");
    });

    it("calls onScan when form is submitted", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU002");

      // Submit form
      fireEvent.submit(input.closest("form")!);

      expect(mockOnScan).toHaveBeenCalledWith("STU002");
    });

    it("clears input after successful scan", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");
      await user.keyboard("{Enter}");

      expect(input).toHaveValue("");
    });

    it("clears input when Escape is pressed", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");
      await user.keyboard("{Escape}");

      expect(input).toHaveValue("");
    });

    it("trims whitespace from input", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "  STU001  ");
      await user.keyboard("{Enter}");

      expect(mockOnScan).toHaveBeenCalledWith("STU001");
    });

    it("does not call onScan with empty input", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.keyboard("{Enter}");

      expect(mockOnScan).not.toHaveBeenCalled();
    });

    it("does not call onScan with whitespace-only input", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "   ");
      await user.keyboard("{Enter}");

      expect(mockOnScan).not.toHaveBeenCalled();
    });
  });

  describe("Focus Management", () => {
    it("maintains focus on input field", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");

      // Input should be focused initially
      expect(input).toHaveFocus();

      // Simulate blur event
      fireEvent.blur(input);

      // Wait for refocus mechanism
      await waitFor(
        () => {
          expect(input).toHaveFocus();
        },
        { timeout: 100 }
      );
    });

    it("refocuses input after scan", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");
      await user.keyboard("{Enter}");

      // Input should maintain focus after scan
      expect(input).toHaveFocus();
    });

    it("refocuses input after Escape", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");
      await user.keyboard("{Escape}");

      // Input should maintain focus after clearing
      expect(input).toHaveFocus();
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels and attributes", () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute(
        "aria-label",
        "مسح رمز QR أو إدخال رقم الطالب"
      );
      expect(input).toHaveAttribute(
        "aria-describedby",
        "qr-scanner-instructions qr-scanner-result"
      );
    });

    it("has proper live region for results", () => {
      renderQRScanner({ result: "تم تسجيل الحضور بنجاح" });

      const alert = screen.getByTestId("alert");
      expect(alert).toHaveAttribute("role", "status");
      expect(alert).toHaveAttribute("aria-live", "assertive");
      expect(alert).toHaveAttribute("aria-atomic", "true");
    });

    it("has proper form structure", () => {
      renderQRScanner();

      const form = screen.getByRole("textbox").closest("form");
      expect(form).toBeInTheDocument();
    });

    it("passes axe accessibility tests", async () => {
      const { container } = renderQRScanner();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe accessibility tests with result", async () => {
      const { container } = renderQRScanner({
        result: "تم تسجيل الحضور بنجاح",
      });
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("RTL Support", () => {
    it("renders Arabic text correctly", () => {
      renderQRScanner();

      expect(screen.getByText("مسح رمز QR للحضور")).toBeInTheDocument();
      expect(screen.getByText(/امسح رمز QR الخاص بالطالب/)).toBeInTheDocument();
    });

    it("handles Arabic input correctly", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      const arabicText = "طالب123";
      await user.type(input, arabicText);

      expect(input).toHaveValue(arabicText);

      await user.keyboard("{Enter}");
      expect(mockOnScan).toHaveBeenCalledWith(arabicText);
    });

    it("displays Arabic results correctly", () => {
      const arabicResult = "تم تسجيل حضور أحمد محمد - حالة الدفع: مدفوع";
      renderQRScanner({ result: arabicResult });

      expect(screen.getByText(arabicResult)).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles special characters in input", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      const specialInput = "STU-001_@#";
      await user.type(input, specialInput);
      await user.keyboard("{Enter}");

      expect(mockOnScan).toHaveBeenCalledWith(specialInput);
    });

    it("handles very long input", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      const longInput = "A".repeat(100);
      await user.type(input, longInput);
      await user.keyboard("{Enter}");

      expect(mockOnScan).toHaveBeenCalledWith(longInput);
    });

    it("handles rapid key presses", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");

      // Rapid typing and Enter
      await user.type(input, "STU001");
      await user.keyboard("{Enter}");
      await user.type(input, "STU002");
      await user.keyboard("{Enter}");

      expect(mockOnScan).toHaveBeenCalledTimes(2);
      expect(mockOnScan).toHaveBeenNthCalledWith(1, "STU001");
      expect(mockOnScan).toHaveBeenNthCalledWith(2, "STU002");
    });

    it("handles multiple Escape presses", async () => {
      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");

      // Multiple Escape presses
      await user.keyboard("{Escape}");
      await user.keyboard("{Escape}");
      await user.keyboard("{Escape}");

      expect(input).toHaveValue("");
      expect(input).toHaveFocus();
    });
  });

  describe("Integration with Hooks", () => {
    it("integrates with useKeyboardNavigation hook", () => {
      const mockUseKeyboardNavigation =
        require("@/hooks/useKeyboardNavigation").useKeyboardNavigation;

      renderQRScanner();

      expect(mockUseKeyboardNavigation).toHaveBeenCalledWith({
        autoFocus: true,
        enableEnterKey: true,
        enableEscapeKey: true,
        onEnter: expect.any(Function),
        onEscape: expect.any(Function),
      });
    });

    it("integrates with useAccessibility hook", () => {
      const mockUseAccessibility =
        require("@/components/accessibility-provider").useAccessibility;

      renderQRScanner();

      expect(mockUseAccessibility).toHaveBeenCalled();
    });

    it("calls announce when scanning", async () => {
      const mockAnnounce = jest.fn();
      require("@/components/accessibility-provider").useAccessibility.mockReturnValue(
        {
          announce: mockAnnounce,
        }
      );

      renderQRScanner();

      const input = screen.getByRole("textbox");
      await user.type(input, "STU001");

      // Submit form to trigger announce
      fireEvent.submit(input.closest("form")!);

      expect(mockAnnounce).toHaveBeenCalledWith("جاري مسح رمز الطالب: STU001");
    });
  });
});
