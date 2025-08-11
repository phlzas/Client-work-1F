import {
  transformStudentsForUI,
  getPaymentStatusText,
  getPaymentStatusColor,
  getPaymentPlanText,
  formatCurrency,
  validateStudentData,
} from "@/lib/data-transform";
import type { Student } from "@/types";

// Mock student data
const mockStudent: Student = {
  id: "STU001",
  name: "أحمد محمد",
  group_name: "المجموعة الأولى",
  payment_plan: "one-time",
  plan_amount: 6000,
  paid_amount: 6000,
  enrollment_date: "2024-01-01",
  payment_status: "paid",
  created_at: "2024-01-01T10:00:00Z",
  updated_at: "2024-01-01T10:00:00Z",
};

describe("Data Transform Utilities", () => {
  describe("transformStudentsForUI", () => {
    it("transforms student data correctly", () => {
      const students = [mockStudent];
      const result = transformStudentsForUI(students);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "STU001",
        name: "أحمد محمد",
        group_name: "المجموعة الأولى",
        payment_status: "paid",
      });
    });

    it("handles empty array", () => {
      const result = transformStudentsForUI([]);
      expect(result).toEqual([]);
    });

    it("handles invalid data gracefully", () => {
      const invalidData = [null, undefined, {}] as any;
      const result = transformStudentsForUI(invalidData);
      expect(result).toEqual([]);
    });
  });

  describe("getPaymentStatusText", () => {
    it("returns correct Arabic text for payment statuses", () => {
      expect(getPaymentStatusText("paid")).toBe("مدفوع");
      expect(getPaymentStatusText("pending")).toBe("في الانتظار");
      expect(getPaymentStatusText("overdue")).toBe("متأخر");
      expect(getPaymentStatusText("due_soon")).toBe("مستحق قريباً");
    });

    it("returns default text for unknown status", () => {
      expect(getPaymentStatusText("unknown")).toBe("غير محدد");
    });
  });

  describe("getPaymentStatusColor", () => {
    it("returns correct CSS classes for payment statuses", () => {
      expect(getPaymentStatusColor("paid")).toContain("bg-green");
      expect(getPaymentStatusColor("pending")).toContain("bg-yellow");
      expect(getPaymentStatusColor("overdue")).toContain("bg-red");
      expect(getPaymentStatusColor("due_soon")).toContain("bg-orange");
    });

    it("returns default color for unknown status", () => {
      expect(getPaymentStatusColor("unknown")).toContain("bg-gray");
    });
  });

  describe("getPaymentPlanText", () => {
    it("returns correct Arabic text for payment plans", () => {
      expect(getPaymentPlanText("one-time")).toBe("دفعة واحدة");
      expect(getPaymentPlanText("monthly")).toBe("شهري");
      expect(getPaymentPlanText("installment")).toBe("أقساط");
    });

    it("returns original text for unknown plan", () => {
      expect(getPaymentPlanText("unknown")).toBe("unknown");
    });
  });

  describe("formatCurrency", () => {
    it("formats currency correctly", () => {
      expect(formatCurrency(1000)).toBe("1,000 ج.م");
      expect(formatCurrency(6000)).toBe("6,000 ج.م");
      expect(formatCurrency(850)).toBe("850 ج.م");
    });

    it("handles zero amount", () => {
      expect(formatCurrency(0)).toBe("0 ج.م");
    });

    it("handles decimal amounts", () => {
      expect(formatCurrency(1000.5)).toBe("1,001 ج.م");
    });
  });

  describe("validateStudentData", () => {
    it("validates correct student data", () => {
      const validData = {
        name: "أحمد محمد",
        group_name: "المجموعة الأولى",
        payment_plan: "one-time",
        plan_amount: 6000,
        paid_amount: 6000,
      };

      const errors = validateStudentData(validData);
      expect(errors).toEqual([]);
    });

    it("returns errors for missing required fields", () => {
      const invalidData = {
        name: "",
        group_name: "",
        payment_plan: "one-time",
        plan_amount: 0,
        paid_amount: -100,
      };

      const errors = validateStudentData(invalidData);
      expect(errors).toContain("اسم الطالب مطلوب");
      expect(errors).toContain("المجموعة مطلوبة");
      expect(errors).toContain("مبلغ الخطة يجب أن يكون أكبر من صفر");
      expect(errors).toContain("المبلغ المدفوع لا يمكن أن يكون سالباً");
    });

    it("validates installment count for installment plan", () => {
      const invalidData = {
        name: "أحمد محمد",
        group_name: "المجموعة الأولى",
        payment_plan: "installment",
        plan_amount: 2850,
        paid_amount: 0,
        installment_count: 0,
      };

      const errors = validateStudentData(invalidData);
      expect(errors).toContain("عدد الأقساط يجب أن يكون أكبر من صفر");
    });

    it("validates payment amount not exceeding plan amount for one-time", () => {
      const invalidData = {
        name: "أحمد محمد",
        group_name: "المجموعة الأولى",
        payment_plan: "one-time",
        plan_amount: 6000,
        paid_amount: 7000,
      };

      const errors = validateStudentData(invalidData);
      expect(errors).toContain("المبلغ المدفوع لا يمكن أن يتجاوز مبلغ الخطة");
    });
  });
});
