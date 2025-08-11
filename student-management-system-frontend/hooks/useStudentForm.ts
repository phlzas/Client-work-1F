import { useState, useCallback, useMemo } from "react";
import type { Student } from "@/types";

interface StudentFormData {
  name: string;
  group: string;
  paymentPlan: "one-time" | "monthly" | "installment";
  planAmount: number;
  installmentCount: number;
  paidAmount: number;
  enrollmentDate: string;
  paymentStatus: "paid" | "pending" | "overdue" | "due_soon";
}

interface UseStudentFormProps {
  student?: Student | null;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

export function useStudentForm({
  student,
  onSubmit,
  onClose,
}: UseStudentFormProps) {
  const [formState, setFormState] = useState<{
    data: StudentFormData;
    errors: Record<string, string>;
    isSubmitting: boolean;
    isDirty: boolean;
  }>({
    data: {
      name: "",
      group: "",
      paymentPlan: "one-time",
      planAmount: 6000,
      installmentCount: 3,
      paidAmount: 0,
      enrollmentDate: new Date().toISOString().split("T")[0],
      paymentStatus: "pending",
    },
    errors: {} as Record<string, string>,
    isSubmitting: false,
    isDirty: false,
  });

  const updateFormData = useCallback((updates: Partial<StudentFormData>) => {
    setFormState((prev) => ({
      ...prev,
      data: { ...prev.data, ...updates },
      isDirty: true,
    }));
  }, []);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    const { data } = formState;

    if (!data.name.trim()) {
      newErrors.name = "اسم الطالب مطلوب";
    } else if (data.name.trim().length < 2) {
      newErrors.name = "اسم الطالب يجب أن يكون حرفين على الأقل";
    }

    if (!data.group.trim()) {
      newErrors.group = "المجموعة مطلوبة";
    }

    if (data.planAmount <= 0) {
      newErrors.planAmount = "مبلغ الخطة يجب أن يكون أكبر من صفر";
    }

    if (data.paidAmount < 0) {
      newErrors.paidAmount = "المبلغ المدفوع لا يمكن أن يكون سالباً";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [formState.data]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;

    setFormState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(formState.data);
      onClose();
    } catch (error) {
      setFormState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          submit: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        },
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.data, validateForm, onSubmit, onClose]);

  const paymentSummary = useMemo(() => {
    const { paymentPlan, planAmount, installmentCount, paidAmount } =
      formState.data;
    const totalAmount =
      paymentPlan === "installment"
        ? planAmount * installmentCount
        : planAmount;
    const remainingAmount = totalAmount - paidAmount;

    return {
      totalAmount,
      remainingAmount,
      isOverpaid: remainingAmount < 0,
    };
  }, [formState.data]);

  return {
    formState,
    updateFormData,
    handleSubmit,
    paymentSummary,
  };
}
