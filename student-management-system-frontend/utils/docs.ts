/**
 * Documentation for Student Management System
 *
 * This file contains documentation and examples for the Student Management System.
 * It should not contain actual implementation code.
 */

import type { Student } from "@/types";

/**
 * Example: Student Form Data Structure
 *
 * This is an example of how student form data should be structured
 * when working with the Student Management System.
 */
export interface StudentFormData {
  name: string;
  group: string;
  paymentPlan: "one-time" | "monthly" | "installment";
  planAmount: number;
  installmentCount: number;
  paidAmount: number;
  enrollmentDate: string;
  paymentStatus: "pending" | "paid" | "overdue";
}

/**
 * Example: Form Validation Rules
 *
 * These are the validation rules that should be applied to student forms:
 * - Name is required and must not be empty
 * - Group is required and must not be empty
 * - Plan amount must be greater than 0
 * - Paid amount cannot be negative
 * - Installment count must be greater than 0 for installment plans
 */
export const VALIDATION_RULES = {
  name: {
    required: true,
    minLength: 1,
    message: "اسم الطالب مطلوب",
  },
  group: {
    required: true,
    minLength: 1,
    message: "المجموعة مطلوبة",
  },
  planAmount: {
    required: true,
    min: 0,
    message: "مبلغ الخطة يجب أن يكون أكبر من صفر",
  },
  paidAmount: {
    required: true,
    min: 0,
    message: "المبلغ المدفوع لا يمكن أن يكون سالباً",
  },
  installmentCount: {
    required: true,
    min: 1,
    message: "عدد الأقساط يجب أن يكون أكبر من صفر",
  },
};

/**
 * Example: Payment Plan Configuration
 *
 * Default payment plan amounts and configurations
 */
export const PAYMENT_PLANS = {
  "one-time": {
    amount: 6000,
    description: "دفعة واحدة",
  },
  monthly: {
    amount: 850,
    description: "شهري",
  },
  installment: {
    amount: 2850,
    description: "أقساط",
  },
};

/**
 * Example: Next Due Date Calculation
 *
 * This function shows how to calculate the next due date based on payment plan
 */
export function calculateNextDueDate(
  enrollmentDate: string,
  paymentPlan: string,
  paidAmount: number,
  planAmount: number
): string | null {
  const enrollment = new Date(enrollmentDate);

  switch (paymentPlan) {
    case "one-time":
      return paidAmount >= planAmount ? null : enrollmentDate;
    case "monthly":
      const nextMonth = new Date(enrollment);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      return nextMonth.toISOString().split("T")[0];
    case "installment":
      const nextInstallment = new Date(enrollment);
      nextInstallment.setMonth(nextInstallment.getMonth() + 3);
      return nextInstallment.toISOString().split("T")[0];
    default:
      return null;
  }
}

/**
 * Example: Form Data Transformation
 *
 * This shows how to transform form data to match the backend Student type
 */
export function transformFormDataToStudent(
  formData: StudentFormData,
  nextDueDate: string | null,
  isUpdate: boolean = false
): Partial<Student> {
  const baseData = {
    name: formData.name,
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
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!isUpdate) {
    return {
      ...baseData,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  return baseData;
}
