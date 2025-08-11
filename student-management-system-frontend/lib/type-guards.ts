import type { Student, PaymentPlan, PaymentStatus } from "@/types";

export function isValidPaymentPlan(value: string): value is PaymentPlan {
  return ["one-time", "monthly", "installment"].includes(value);
}

export function isValidPaymentStatus(value: string): value is PaymentStatus {
  return ["paid", "pending", "overdue", "due_soon"].includes(value);
}

export function isStudent(obj: any): obj is Student {
  return (
    obj &&
    typeof obj === "object" &&
    typeof obj.id === "string" &&
    typeof obj.name === "string" &&
    (typeof obj.group === "string" || typeof obj.group_name === "string")
  );
}

export function validateStudentData(data: Partial<Student>): string[] {
  const errors: string[] = [];

  if (!data.name?.trim()) {
    errors.push("اسم الطالب مطلوب");
  }

  if (!data.group?.trim() && !data.group_name?.trim()) {
    errors.push("المجموعة مطلوبة");
  }

  const planAmount = data.plan_amount || data.planAmount || 0;
  if (planAmount <= 0) {
    errors.push("مبلغ الخطة يجب أن يكون أكبر من صفر");
  }

  const paidAmount = data.paid_amount || data.paidAmount || 0;
  if (paidAmount < 0) {
    errors.push("المبلغ المدفوع لا يمكن أن يكون سالباً");
  }

  return errors;
}
