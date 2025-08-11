import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentGrid } from "@/components/student-grid";
import { AccessibilityProvider } from "@/components/accessibility-provider";
import { KeyboardNavigationProvider } from "@/components/keyboard-navigation-provider";
import type { Student } from "@/types";

// Mock hooks and utilities
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
  transformStudentsForUI: (students: Student[]) => students,
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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AccessibilityProvider>
    <KeyboardNavigationProvider>{children}</KeyboardNavigationProvider>
  </AccessibilityProvider>
);

const mockStudents: Student[] = [
  {
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
    group: "المجموعة الأولى",
    paymentPlan: "one-time",
    planAmount: 6000,
    paidAmount: 6000,
    paymentStatus: "paid",
  },
  {
    id: "STU002",
    name: "فاطمة علي",
    group_name: "المجموعة الثانية",
    payment_plan: "monthly",
    plan_amount: 850,
    paid_amount: 0,
    enrollment_date: "2024-01-01",
    payment_status: "overdue",
    created_at: "2024-01-01",
    updated_at: "2024-01-01",
    group: "المجموعة الثانية",
    paymentPlan: "monthly",
    planAmount: 850,
    paidAmount: 0,
    paymentStatus: "overdue",
  },
];

describe("StudentGrid Component", () => {
  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnAdd = jest.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    students: mockStudents,
    onEditStudent: mockOnEdit,
    onDeleteStudent: mockOnDelete,
    onAddStudent: mockOnAdd,
  };

  it("renders correctly with students data", () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("قائمة الطلاب")).toBeInTheDocument();
    expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
    expect(screen.getByText("فاطمة علي")).toBeInTheDocument();
  });

  it("displays correct table headers", () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("رقم الطالب")).toBeInTheDocument();
    expect(screen.getByText("الاسم")).toBeInTheDocument();
    expect(screen.getByText("المجموعة")).toBeInTheDocument();
    expect(screen.getByText("خطة الدفع")).toBeInTheDocument();
    expect(screen.getByText("المبلغ المدفوع")).toBeInTheDocument();
    expect(screen.getByText("حالة الدفع")).toBeInTheDocument();
  });

  it("handles search functionality", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "أحمد");

    // Wait for debounced search
    await waitFor(() => {
      expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
      expect(screen.queryByText("فاطمة علي")).not.toBeInTheDocument();
    });
  });

  it("handles group filtering", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const groupFilter = screen.getByDisplayValue("جميع المجموعات");
    await user.click(groupFilter);

    const groupOption = screen.getByText("المجموعة الأولى");
    await user.click(groupOption);

    expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
    expect(screen.queryByText("فاطمة علي")).not.toBeInTheDocument();
  });

  it("handles status filtering", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const statusFilter = screen.getByDisplayValue("جميع الحالات");
    await user.click(statusFilter);

    const statusOption = screen.getByText("مدفوع");
    await user.click(statusOption);

    expect(screen.getByText("أحمد محمد")).toBeInTheDocument();
    expect(screen.queryByText("فاطمة علي")).not.toBeInTheDocument();
  });

  it("calls onEditStudent when edit button is clicked", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const editButtons = screen.getAllByLabelText(/تعديل بيانات الطالب/);
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockStudents[0]);
  });

  it("calls onDeleteStudent when delete button is clicked", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const deleteButtons = screen.getAllByLabelText(/حذف الطالب/);
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockStudents[0]);
  });

  it("calls onAddStudent when add button is clicked", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const addButton = screen.getByText("إضافة طالب جديد");
    await user.click(addButton);

    expect(mockOnAdd).toHaveBeenCalled();
  });

  it("displays no results message when filtered list is empty", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "غير موجود");

    await waitFor(() => {
      expect(
        screen.getByText("لا توجد نتائج مطابقة للبحث")
      ).toBeInTheDocument();
    });
  });

  it("handles empty students array gracefully", () => {
    render(
      <TestWrapper>
        <StudentGrid {...{ ...defaultProps, students: [] }} />
      </TestWrapper>
    );

    expect(screen.getByText("قائمة الطلاب")).toBeInTheDocument();
    expect(screen.getByText("لا توجد نتائج مطابقة للبحث")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const table = screen.getByRole("table");
    expect(table).toHaveAttribute("aria-label", "جدول الطلاب");

    const searchInput = screen.getByRole("searchbox");
    expect(searchInput).toHaveAttribute("aria-label", "البحث في قائمة الطلاب");
  });

  it("supports keyboard navigation", async () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const table = screen.getByRole("table");
    table.focus();

    // Simulate arrow key navigation
    fireEvent.keyDown(table, { key: "ArrowDown" });
    fireEvent.keyDown(table, { key: "Enter" });

    expect(mockOnEdit).toHaveBeenCalled();
  });

  it("displays payment status badges with correct colors", () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    const paidBadge = screen.getByText("مدفوع");
    const overdueBadge = screen.getByText("متأخر");

    expect(paidBadge).toHaveClass("bg-green-100");
    expect(overdueBadge).toHaveClass("bg-red-100");
  });

  it("formats currency correctly", () => {
    render(
      <TestWrapper>
        <StudentGrid {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("6,000 ج.م / 6,000 ج.م")).toBeInTheDocument();
    expect(screen.getByText("0 ج.م / 850 ج.م")).toBeInTheDocument();
  });

  it("handles invalid students data gracefully", () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

    render(
      <TestWrapper>
        <StudentGrid {...{ ...defaultProps, students: null as any }} />
      </TestWrapper>
    );

    expect(consoleSpy).toHaveBeenCalledWith(
      "StudentGrid: students prop is not an array:",
      null
    );
    expect(screen.getByText("لا توجد نتائج مطابقة للبحث")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
