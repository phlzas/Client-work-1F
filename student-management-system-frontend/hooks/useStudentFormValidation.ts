import { useMemo } from "react";

interface FormData {
  name: string;
  group: string;
  paymentPlan: "one-time" | "monthly" | "installment";
  planAmount: number;
  installmentCount: number;
  paidAmount: number;
}

interface ValidationContext {
  groupsLoading: boolean;
  groupsError: string | null;
  groupsAvailable: boolean;
}

export function useStudentFormValidation(
  formData: FormData,
  context: ValidationContext
) {
  const errors = useMemo(() => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "اسم الطالب مطلوب";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "اسم الطالب يجب أن يكون أكثر من حرف واحد";
    }

    // Group validation with better context awareness
    if (!formData.group.trim() || formData.group.startsWith("__")) {
      if (context.groupsLoading) {
        newErrors.group = "جاري تحميل المجموعات، يرجى الانتظار";
      } else if (context.groupsError) {
        newErrors.group = "خطأ في تحميل المجموعات، يرجى المحاولة مرة أخرى";
      } else if (!context.groupsAvailable) {
        newErrors.group = "لا توجد مجموعات متاحة، يرجى إنشاء مجموعة أولاً";
      } else {
        newErrors.group = "المجموعة مطلوبة";
      }
    }

    // Amount validations with better messages
    if (formData.planAmount <= 0) {
      newErrors.planAmount = "مبلغ الخطة يجب أن يكون أكبر من صفر";
    } else if (formData.planAmount > 1000000) {
      newErrors.planAmount = "مبلغ الخطة كبير جداً";
    }

    if (formData.paidAmount < 0) {
      newErrors.paidAmount = "المبلغ المدفوع لا يمكن أن يكون سالباً";
    } else if (formData.paidAmount > formData.planAmount * 10) {
      newErrors.paidAmount = "المبلغ المدفوع كبير جداً مقارنة بالخطة";
    }

    // Installment validation
    if (formData.paymentPlan === "installment") {
      if (formData.installmentCount <= 0) {
        newErrors.installmentCount = "عدد الأقساط يجب أن يكون أكبر من صفر";
      } else if (formData.installmentCount > 24) {
        newErrors.installmentCount = "عدد الأقساط كبير جداً (الحد الأقصى 24)";
      }
    }

    return newErrors;
  }, [formData, context]);

  const isValid = Object.keys(errors).length === 0;
  const hasErrors = !isValid;

  return {
    errors,
    isValid,
    hasErrors,
  };
}
