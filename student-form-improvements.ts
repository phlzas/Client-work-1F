// Create a utility function to transform form data to Student object
function transformFormDataToStudent(
  formData: FormData,
  nextDueDate: string | null,
  isUpdate: boolean = false
): Partial<Student> {
  const baseData = {
    name: formData.name,
    group_name: formData.group,
    group: formData.group, // Keep both for compatibility
    payment_plan: formData.paymentPlan,
    paymentPlan: formData.paymentPlan, // Keep both for compatibility
    plan_amount: formData.planAmount,
    planAmount: formData.planAmount, // Keep both for compatibility
    installment_count: formData.installmentCount,
    installmentCount: formData.installmentCount, // Keep both for compatibility
    paid_amount: formData.paidAmount,
    paidAmount: formData.paidAmount, // Keep both for compatibility
    enrollment_date: formData.enrollmentDate,
    enrollmentDate: formData.enrollmentDate, // Keep both for compatibility
    payment_status: formData.paymentStatus,
    paymentStatus: formData.paymentStatus, // Keep both for compatibility
    next_due_date: nextDueDate,
    nextDueDate: nextDueDate, // Keep both for compatibility
    updated_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(), // Keep both for compatibility
  };

  if (!isUpdate) {
    return {
      ...baseData,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(), // Keep both for compatibility
    };
  }

  return baseData;
}

// Simplified handleSubmit function
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const nextDueDate = calculateNextDueDate();
  const transformedData = transformFormDataToStudent(
    formData,
    nextDueDate,
    !!student
  );

  if (student) {
    onSubmit({
      ...student,
      ...transformedData,
    });
  } else {
    onSubmit(transformedData as any);
  }
};

// Even better: Use existing data-transform utility
import { createStudentForBackend } from "@/lib/data-transform";

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const nextDueDate = calculateNextDueDate();

  // Create clean student data using existing utility
  const studentData = createStudentForBackend({
    name: formData.name,
    group: formData.group,
    paymentPlan: formData.paymentPlan,
    planAmount: formData.planAmount,
    installmentCount: formData.installmentCount,
    paidAmount: formData.paidAmount,
    enrollmentDate: formData.enrollmentDate,
    paymentStatus: formData.paymentStatus,
  });

  if (student) {
    onSubmit({
      ...student,
      ...studentData,
      next_due_date: nextDueDate,
      nextDueDate: nextDueDate,
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } else {
    onSubmit({
      ...studentData,
      next_due_date: nextDueDate,
      nextDueDate: nextDueDate,
      created_at: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any);
  }
};
// Create proper types for form operations
type StudentFormData = Omit<
  Student,
  "id" | "attendance_log" | "payment_history"
>;
type StudentUpdateData = Partial<Student> & { id: string };

interface StudentFormProps {
  student?: Student | null;
  settings: AppSettings;
  onSubmit: (student: StudentFormData | StudentUpdateData) => void;
  onClose: () => void;
}

// Remove the `as any` cast by using proper typing
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  const nextDueDate = calculateNextDueDate();
  const timestamp = new Date().toISOString();

  const baseStudentData: StudentFormData = {
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
    created_at: timestamp,
    createdAt: timestamp,
    updated_at: timestamp,
    updatedAt: timestamp,
  };

  if (student) {
    const updateData: StudentUpdateData = {
      ...student,
      ...baseStudentData,
      id: student.id, // Ensure ID is preserved
    };
    onSubmit(updateData);
  } else {
    onSubmit(baseStudentData);
  }
};
// Create helper to safely extract student data
function extractStudentFormData(student: Student | null): FormData {
  if (!student) {
    return {
      name: "",
      group: "",
      paymentPlan: "one-time",
      planAmount: 6000,
      installmentCount: 3,
      paidAmount: 0,
      enrollmentDate: new Date().toISOString().split("T")[0],
      paymentStatus: "pending",
    };
  }

  return {
    name: student.name,
    group: student.group_name || student.group || "",
    paymentPlan: student.payment_plan || student.paymentPlan || "one-time",
    planAmount: student.plan_amount || student.planAmount || 0,
    installmentCount:
      student.installment_count || student.installmentCount || 3,
    paidAmount: student.paid_amount || student.paidAmount || 0,
    enrollmentDate:
      student.enrollment_date ||
      student.enrollmentDate ||
      new Date().toISOString().split("T")[0],
    paymentStatus: student.payment_status || student.paymentStatus || "pending",
  };
}

// Use useMemo for expensive calculations
import { useMemo } from "react";

const paymentSummary = useMemo(() => {
  const totalAmount =
    formData.paymentPlan === "installment"
      ? formData.planAmount * formData.installmentCount
      : formData.planAmount;

  const remaining = totalAmount - formData.paidAmount;

  return {
    totalAmount,
    remaining,
    paidAmount: formData.paidAmount,
  };
}, [
  formData.paymentPlan,
  formData.planAmount,
  formData.installmentCount,
  formData.paidAmount,
]);

// Memoize validation to avoid recalculation
const validationErrors = useMemo(() => {
  const errors: Record<string, string> = {};

  if (!formData.name.trim()) {
    errors.name = "اسم الطالب مطلوب";
  }

  if (!formData.group.trim()) {
    errors.group = "المجموعة مطلوبة";
  }

  if (formData.planAmount <= 0) {
    errors.planAmount = "مبلغ الخطة يجب أن يكون أكبر من صفر";
  }

  if (formData.paidAmount < 0) {
    errors.paidAmount = "المبلغ المدفوع لا يمكن أن يكون سالباً";
  }

  if (
    formData.paymentPlan === "installment" &&
    formData.installmentCount <= 0
  ) {
    errors.installmentCount = "عدد الأقساط يجب أن يكون أكبر من صفر";
  }

  return errors;
}, [formData]);

const isFormValid = Object.keys(validationErrors).length === 0;
// Extract business logic to custom hooks
import { useCallback } from "react";

// Custom hook for form logic
function useStudentForm(student: Student | null, settings: AppSettings) {
  const [formData, setFormData] = useState(() =>
    extractStudentFormData(student)
  );

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const calculateNextDueDate = useCallback(() => {
    const enrollmentDate = new Date(formData.enrollmentDate);

    switch (formData.paymentPlan) {
      case "one-time":
        return formData.paidAmount >= formData.planAmount
          ? null
          : formData.enrollmentDate;
      case "monthly":
        const nextMonth = new Date(enrollmentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString().split("T")[0];
      case "installment":
        const nextInstallment = new Date(enrollmentDate);
        nextInstallment.setMonth(nextInstallment.getMonth() + 3);
        return nextInstallment.toISOString().split("T")[0];
      default:
        return null;
    }
  }, [
    formData.enrollmentDate,
    formData.paymentPlan,
    formData.paidAmount,
    formData.planAmount,
  ]);

  const handlePaymentPlanChange = useCallback(
    (plan: "one-time" | "monthly" | "installment") => {
      const planAmounts = {
        "one-time": 6000,
        monthly: 850,
        installment: 2850,
      };

      updateFormData({
        paymentPlan: plan,
        planAmount: planAmounts[plan],
      });
    },
    [updateFormData]
  );

  return {
    formData,
    updateFormData,
    calculateNextDueDate,
    handlePaymentPlanChange,
    validationErrors,
    isFormValid,
    paymentSummary,
  };
}

// Simplified component using the custom hook
export function StudentForm({
  student,
  settings,
  onSubmit,
  onClose,
}: StudentFormProps) {
  const {
    formData,
    updateFormData,
    calculateNextDueDate,
    handlePaymentPlanChange,
    validationErrors,
    isFormValid,
    paymentSummary,
  } = useStudentForm(student, settings);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!isFormValid) {
        return;
      }

      const nextDueDate = calculateNextDueDate();
      const studentData = createStudentForBackend({
        name: formData.name,
        group: formData.group,
        paymentPlan: formData.paymentPlan,
        planAmount: formData.planAmount,
        installmentCount: formData.installmentCount,
        paidAmount: formData.paidAmount,
        enrollmentDate: formData.enrollmentDate,
        paymentStatus: formData.paymentStatus,
      });

      const timestamp = new Date().toISOString();

      if (student) {
        onSubmit({
          ...student,
          ...studentData,
          next_due_date: nextDueDate,
          nextDueDate: nextDueDate,
          updated_at: timestamp,
          updatedAt: timestamp,
        });
      } else {
        onSubmit({
          ...studentData,
          next_due_date: nextDueDate,
          nextDueDate: nextDueDate,
          created_at: timestamp,
          createdAt: timestamp,
          updated_at: timestamp,
          updatedAt: timestamp,
        });
      }
    },
    [isFormValid, calculateNextDueDate, formData, student, onSubmit]
  );

  // Rest of component remains the same but much cleaner
}
