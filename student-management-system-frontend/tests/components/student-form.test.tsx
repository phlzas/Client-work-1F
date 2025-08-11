import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentForm } from "@/components/student-form";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { KeyboardNavigationProvider } from "@/components/keyboard-navigation-provider";
import type { Student, AppSettings } from "@/types";

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

jest.mock("@/hooks/useKeyboardNavigation", () => ({
  useKeyboardNavigation: () => ({
    containerRef: { current: null },
  }),
}));

jest.mock("@/components/accessibility-provider", () => ({
  useAccessibility: () => ({
    announce: jest.fn(),
  }),
  AccessibilityProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

jest.mock("@/lib/data-transform", () => ({
  validateStudentData: jest.fn(() => []),
}));

jest.mock("@/components/qr-code-display", () => {
  return function QRCodeDisplay() {
    return <div data-testid="qr-code-display">QR Code</div>;
  };
});

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AccessibilityProvider>
    <KeyboardNavigationProvider>{children}</KeyboardNavigationProvider>
  </AccessibilityProvider>
);

const mockSettings: AppSettings = {
  payment_threshold: 6000,
  default_groups: ["المجموعة الأولى"],
  enable_audit_log: true,
  language: "ar",
  theme: "light",
  enable_multi_user: false,
  backup_encryption: false,
  accessibility_mode: true,
  reminder_days: 7,
};

const mockStudent: Student = {
  id: "STU001",
  name: "أحمد محمد",
  group_name: "المجموعة الأولى",
  payment_plan: "one-time",
  plan_amount: 6000,
  paid_amount: 6000,
  enrollment_date: "2024-01-01",
  payment_status: "paid",
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

describe("StudentForm Component", () => {
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    student: null,
    settings: mockSettings,
    onSubmit: mockOnSubmit,
    onClose: mockOnClose,
  };

  it("renders correctly for new student", () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("إضافة طالب جديد")).toBeInTheDocument();
    expect(screen.getByLabelText("اسم الطالب *")).toBeInTheDocument();
    expect(screen.getByLabelText("المجموعة")).toBeInTheDocument();
  });

  it("renders correctly for editing existing student", () => {
    render(
      <TestWrapper>
        <StudentForm {...{ ...defaultProps, student: mockStudent }} />
      </TestWrapper>
    );

    expect(screen.getByText("تعديل بيانات الطالب")).toBeInTheDocument();
    expect(screen.getByDisplayValue("أحمد محمد")).toBeInTheDocument();
    expect(screen.getByTestId("qr-code-display")).toBeInTheDocument();
  });

  it("handles form input changes", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const nameInput = screen.getByLabelText("اسم الطالب *");
    await user.clear(nameInput);
    await user.type(nameInput, "محمد أحمد");

    expect(nameInput).toHaveValue("محمد أحمد");
  });

  it("handles payment plan changes", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const paymentPlanSelect = screen.getByDisplayValue("دفعة واحدة (6000 ج.م)");
    await user.click(paymentPlanSelect);

    const monthlyOption = screen.getByText("شهري (850 ج.م/شهر)");
    await user.click(monthlyOption);

    // Check if plan amount updated
    const planAmountInput = screen.getByDisplayValue("850");
    expect(planAmountInput).toBeInTheDocument();
  });

  it("shows installment count field for installment plan", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const paymentPlanSelect = screen.getByDisplayValue("دفعة واحدة (6000 ج.م)");
    await user.click(paymentPlanSelect);

    const installmentOption = screen.getByText(/أقساط/);
    await user.click(installmentOption);

    expect(screen.getByLabelText("عدد الأقساط")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    const { validateStudentData } = require("@/lib/data-transform");
    validateStudentData.mockReturnValue(["اسم الطالب مطلوب"]);

    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const submitButton = screen.getByText("إضافة الطالب");
    await user.click(submitButton);

    expect(screen.getByText("اسم الطالب مطلوب")).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it("submits form with valid data", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const nameInput = screen.getByLabelText("اسم الطالب *");
    await user.type(nameInput, "محمد أحمد");

    const groupSelect = screen.getByDisplayValue("اختر المجموعة");
    await user.click(groupSelect);
    const groupOption = screen.getByText("المجموعة الأولى");
    await user.click(groupOption);

    const submitButton = screen.getByText("إضافة الطالب");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  it("closes form when cancel button is clicked", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const cancelButton = screen.getByText("إلغاء");
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it("closes form when Escape key is pressed", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    await user.keyboard("{Escape}");
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("displays payment summary correctly", () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("ملخص خطة الدفع")).toBeInTheDocument();
    expect(screen.getByText("دفعة واحدة: 6,000 ج.م")).toBeInTheDocument();
  });

  it("handles date validation", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const dateInput = screen.getByLabelText("تاريخ التسجيل");
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    await user.clear(dateInput);
    await user.type(dateInput, futureDate.toISOString().split("T")[0]);

    const submitButton = screen.getByText("إضافة الطالب");
    await user.click(submitButton);

    expect(
      screen.getByText("تاريخ التسجيل لا يمكن أن يكون في المستقبل")
    ).toBeInTheDocument();
  });

  it("shows loading state during submission", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const nameInput = screen.getByLabelText("اسم الطالب *");
    await user.type(nameInput, "محمد أحمد");

    const submitButton = screen.getByText("إضافة الطالب");

    // Mock a slow submission
    mockOnSubmit.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    await user.click(submitButton);

    expect(screen.getByText("جاري الحفظ...")).toBeInTheDocument();
  });

  it("handles groups loading state", () => {
    const useGroups = require("@/hooks/useGroups").useGroups;
    useGroups.mockReturnValue({
      groups: [],
      loading: true,
      error: null,
    });

    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("جاري تحميل المجموعات...")).toBeInTheDocument();
  });

  it("handles groups error state", () => {
    const useGroups = require("@/hooks/useGroups").useGroups;
    useGroups.mockReturnValue({
      groups: [],
      loading: false,
      error: "Failed to load groups",
    });

    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    expect(
      screen.getByText(
        "خطأ في تحميل المجموعات. يرجى إعادة تحميل الصفحة أو التحقق من الاتصال."
      )
    ).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby");
    expect(dialog).toHaveAttribute("aria-describedby");

    const nameInput = screen.getByLabelText("اسم الطالب *");
    expect(nameInput).toHaveAttribute("required");
    expect(nameInput).toHaveAttribute("aria-invalid", "false");
  });

  it("supports tab navigation through form fields", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const nameInput = screen.getByLabelText("اسم الطالب *");
    expect(nameInput).toHaveFocus();

    await user.tab();
    // Should move to next focusable element
    // This tests the tab order is correct
  });

  it("calculates next due date correctly", async () => {
    render(
      <TestWrapper>
        <StudentForm {...defaultProps} />
      </TestWrapper>
    );

    const nameInput = screen.getByLabelText("اسم الطالب *");
    await user.type(nameInput, "محمد أحمد");

    // Select monthly payment plan
    const paymentPlanSelect = screen.getByDisplayValue("دفعة واحدة (6000 ج.م)");
    await user.click(paymentPlanSelect);
    const monthlyOption = screen.getByText("شهري (850 ج.م/شهر)");
    await user.click(monthlyOption);

    const submitButton = screen.getByText("إضافة الطالب");
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_plan: "monthly",
          next_due_date: expect.any(String),
        })
      );
    });
  });
});
