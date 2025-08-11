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
    group: student.group_name || "",
    paymentPlan: student.payment_plan as FormData["paymentPlan"],
    planAmount: student.plan_amount,
    installmentCount: student.installment_count || 3,
    paidAmount: student.paid_amount,
    enrollmentDate: student.enrollment_date,
    paymentStatus: student.payment_status as FormData["paymentStatus"],
  };
}

/**
 * Transforms form data to student format
 */
export function formDataToStudent(
  formData: FormData,
  nextDueDate: string | null
): Partial<Student> {
  const timestamp = new Date().toISOString();

  return {
    name: formData.name,
    group_name: formData.group,
    payment_plan: formData.paymentPlan,
    plan_amount: formData.planAmount,
    installment_count: formData.installmentCount,
    paid_amount: formData.paidAmount,
    enrollment_date: formData.enrollmentDate,
    payment_status: formData.paymentStatus,
    next_due_date: nextDueDate,
    created_at: timestamp,
    updated_at: timestamp,
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
