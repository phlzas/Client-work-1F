import type { Student } from "@/types";

interface FormData {
  name: string;
  group: string;
  paymentPlan: "one-time" | "monthly" | "installment";
  planAmount: number;
  installmentCount: number;
  paidAmount: number;
  enrollmentDate: string;
  paymentStatus: "paid" | "pending" | "overdue" | "due_soon";
}

/**
 * Transforms student data from backend format to form format
 */
export function studentToFormData(student: Student): FormData {
  return {
    name: student.name,
    group: student.group_name || student.group || "",
    paymentPlan: (student.payment_plan ||
      student.paymentPlan ||
      "one-time") as FormData["paymentPlan"],
    planAmount: student.plan_amount || student.planAmount || 0,
    installmentCount:
      student.installment_count || student.installmentCount || 3,
    paidAmount: student.paid_amount || student.paidAmount || 0,
    enrollmentDate:
      student.enrollment_date ||
      student.enrollmentDate ||
      new Date().toISOString().split("T")[0],
    paymentStatus: (student.payment_status ||
      student.paymentStatus ||
      "pending") as FormData["paymentStatus"],
  };
}

/**
 * Transforms form data to student format with both snake_case and camelCase for compatibility
 */
export function formDataToStudent(
  formData: FormData,
  nextDueDate: string | null
): Partial<Student> {
  const timestamp = new Date().toISOString();

  return {
    name: formData.name,
    // Provide both formats for compatibility
    group_name: formData.group,
    group: formData.group,
    payment_plan: formData.paymentPlan,
    paymentPlan: formData.paymentPlan,
    plan_amount: formData.planAmount,
    planAmount: formData.planAmount,
    installment_count: formData.installmentCount,
    installmentCount: formData.installmentCount,
    paid_amount: formData.paidAmount,
    paidAmount: formData.paidAmount,
    enrollment_date: formData.enrollmentDate,
    enrollmentDate: formData.enrollmentDate,
    payment_status: formData.paymentStatus,
    paymentStatus: formData.paymentStatus,
    next_due_date: nextDueDate,
    nextDueDate: nextDueDate,
    created_at: timestamp,
    createdAt: timestamp,
    updated_at: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Calculates the next due date based on payment plan and enrollment date
 */
export function calculateNextDueDate(
  paymentPlan: FormData["paymentPlan"],
  enrollmentDate: string,
  paidAmount: number,
  planAmount: number
): string | null {
  const enrollment = new Date(enrollmentDate);

  switch (paymentPlan) {
    case "one-time":
      return paidAmount >= planAmount ? null : enrollmentDate;
    case "monthly": {
      const nextMonth = new Date(enrollment);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString().split("T")[0];
    }
    case "installment": {
      const nextInstallment = new Date(enrollment);
      nextInstallment.setMonth(nextInstallment.getMonth() + 3);
      return nextInstallment.toISOString().split("T")[0];
    }
    default:
      return null;
  }
}
