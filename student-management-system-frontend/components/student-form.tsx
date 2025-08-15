"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Student, AppSettings, StudentFormData } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGroups } from "@/hooks/useGroups";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { validateStudentData } from "@/lib/data-transform";
import QRCodeDisplay from "@/components/qr-code-display";
import { useAccessibility } from "@/components/accessibility-provider";
import { ariaLabels, FocusManager } from "@/lib/accessibility";

interface StudentFormProps {
  student?: Student | null;
  settings?: AppSettings; // Made optional since we're not using it
  onSubmit: (
    student:
      | Student
      | Omit<
          Student,
          "id" | "attendanceLog" | "paymentHistory" | "createdAt" | "updatedAt"
        >
  ) => void;
  onClose: () => void;
}

// Constants for select item states
const SELECT_STATES = {
  LOADING: "__loading__",
  ERROR: "__error__",
  EMPTY: "__empty__",
} as const;

// Memoized payment summary component with optimized calculations
const PaymentSummary = React.memo(
  ({
    paymentPlan,
    planAmount,
    installmentCount,
    paidAmount,
  }: {
    paymentPlan: string;
    planAmount: number;
    installmentCount: number;
    paidAmount: number;
  }) => {
    const totalAmount = useMemo(() => {
      return paymentPlan === "installment"
        ? planAmount * installmentCount
        : planAmount;
    }, [paymentPlan, planAmount, installmentCount]);

    const remainingAmount = useMemo(() => {
      return totalAmount - paidAmount;
    }, [totalAmount, paidAmount]);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ملخص خطة الدفع</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {paymentPlan === "one-time" && (
            <p>دفعة واحدة: {planAmount.toLocaleString()} ج.م</p>
          )}
          {paymentPlan === "monthly" && (
            <p>دفع شهري: {planAmount.toLocaleString()} ج.م كل شهر</p>
          )}
          {paymentPlan === "installment" && (
            <>
              <p>عدد الأقساط: {installmentCount}</p>
              <p>مبلغ القسط: {planAmount.toLocaleString()} ج.م</p>
              <p>إجمالي المبلغ: {totalAmount.toLocaleString()} ج.م</p>
            </>
          )}
          <p>المبلغ المدفوع: {paidAmount.toLocaleString()} ج.م</p>
          <p
            className={remainingAmount < 0 ? "text-red-600 font-semibold" : ""}
          >
            المتبقي: {remainingAmount.toLocaleString()} ج.م
          </p>
        </CardContent>
      </Card>
    );
  }
);

export function StudentForm({ student, onSubmit, onClose }: StudentFormProps) {
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  const { settings: paymentSettings } = usePaymentSettings();
  const { announce } = useAccessibility();

  // Keyboard navigation disabled per request
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Consolidated form state with better typing
  const [formState, setFormState] = useState({
    data: {
      name: "",
      group: "",
      paymentPlan: "one-time" as "one-time" | "monthly" | "installment",
      planAmount: 6000,
      installmentCount: 3,
      paidAmount: 0,
      enrollmentDate: new Date().toISOString().split("T")[0],
      paymentStatus: "pending" as "paid" | "pending" | "overdue" | "due_soon",
    },
    errors: {} as Record<string, string>,
    isSubmitting: false,
    isDirty: false,
  });

  const formData = formState.data;

  // Helper function to update form data
  const updateFormData = useCallback(
    (updates: Partial<typeof formState.data>) => {
      setFormState((prev) => ({
        ...prev,
        data: { ...prev.data, ...updates },
        isDirty: true,
      }));
    },
    []
  );

  useEffect(() => {
    if (student) {
      setFormState((prev) => ({
        ...prev,
        data: {
          name: student.name,
          group: student.group_name || student.group || "",
          paymentPlan: (student.payment_plan ||
            student.paymentPlan ||
            "one-time") as "one-time" | "monthly" | "installment",
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
            "pending") as "paid" | "pending" | "overdue" | "due_soon",
        },
      }));
    }
  }, [student]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // Use centralized validation
    const validationErrors = validateStudentData({
      name: formData.name,
      group_name: formData.group,
      payment_plan: formData.paymentPlan,
      plan_amount: formData.planAmount,
      paid_amount: formData.paidAmount,
      installment_count: formData.installmentCount,
    });

    // Map validation errors to form fields
    validationErrors.forEach((error) => {
      if (error.includes("اسم الطالب")) {
        newErrors.name = error;
      } else if (error.includes("المجموعة")) {
        newErrors.group = error;
      } else if (error.includes("مبلغ الخطة")) {
        newErrors.planAmount = error;
      } else if (error.includes("المبلغ المدفوع")) {
        newErrors.paidAmount = error;
      } else if (error.includes("عدد الأقساط")) {
        newErrors.installmentCount = error;
      }
    });

    // Additional UI-specific validations
    if (
      !formData.group.trim() ||
      Object.values(SELECT_STATES).includes(formData.group as any)
    ) {
      if (groupsLoading) {
        newErrors.group = "جاري تحميل المجموعات، يرجى الانتظار";
      } else if (groupsError) {
        newErrors.group = "خطأ في تحميل المجموعات، يرجى المحاولة مرة أخرى";
      } else if (groups.length === 0) {
        newErrors.group = "لا توجد مجموعات متاحة، يرجى إنشاء مجموعة أولاً";
      }
    }

    // Date validation
    const enrollmentDate = new Date(formData.enrollmentDate);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    if (enrollmentDate > today) {
      newErrors.enrollmentDate = "تاريخ التسجيل لا يمكن أن يكون في المستقبل";
    } else if (enrollmentDate < oneYearAgo) {
      newErrors.enrollmentDate = "تاريخ التسجيل قديم جداً";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  }, [formData, groupsLoading, groupsError, groups.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted with data:", formData);

    if (!validateForm()) {
      console.log("Form validation failed:", formState.errors);
      return;
    }

    setFormState((prev) => ({ ...prev, isSubmitting: true }));

    try {
      const nextDueDate = calculateNextDueDate();
      console.log("Calculated next due date:", nextDueDate);

      // Create student data with proper backend format
      const studentData: StudentFormData = {
        name: formData.name,
        group_name: formData.group,
        payment_plan: formData.paymentPlan,
        plan_amount: formData.planAmount,
        installment_count: formData.installmentCount,
        paid_amount: formData.paidAmount,
        enrollment_date: formData.enrollmentDate,
        payment_status: formData.paymentStatus,
        next_due_date: nextDueDate,
      };

      if (student) {
        console.log("Updating existing student:", student.id);
        announce(`جاري تحديث بيانات الطالب ${formData.name}`);
        onSubmit({
          ...student,
          ...studentData,
        });
      } else {
        console.log("Adding new student");
        announce(`جاري إضافة الطالب ${formData.name}`);
        onSubmit(studentData as any);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      const errorMessage =
        error instanceof Error
          ? `حدث خطأ: ${error.message}`
          : "حدث خطأ غير متوقع أثناء حفظ البيانات";

      setFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, submit: errorMessage },
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

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
      let newPlanAmount = 6000;

      if (paymentSettings) {
        switch (plan) {
          case "one-time":
            newPlanAmount = paymentSettings.one_time_amount;
            break;
          case "monthly":
            newPlanAmount = paymentSettings.monthly_amount;
            break;
          case "installment":
            newPlanAmount = paymentSettings.installment_amount;
            break;
        }
      }

      updateFormData({
        paymentPlan: plan,
        planAmount: newPlanAmount,
      });
    },
    [paymentSettings, updateFormData]
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
        ref={containerRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        aria-labelledby="student-form-title"
        aria-describedby="student-form-description"
      >
        <DialogHeader>
          <DialogTitle id="student-form-title">
            {student ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
          </DialogTitle>
          <div id="student-form-description" className="sr-only">
            {student
              ? "نموذج لتعديل بيانات الطالب الحالي"
              : "نموذج لإضافة طالب جديد إلى النظام"}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الطالب *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="أدخل اسم الطالب"
                className={formState.errors.name ? "border-red-500" : ""}
                required
                aria-invalid={!!formState.errors.name}
                aria-describedby={
                  formState.errors.name ? "name-error" : undefined
                }
                // Remove autofocus to prevent stealing focus from other fields
              />
              {formState.errors.name && (
                <p
                  className="text-sm text-red-500"
                  id="name-error"
                  role="alert"
                >
                  {formState.errors.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">المجموعة</Label>
              <Select
                value={formData.group}
                onValueChange={(value) => updateFormData({ group: value })}
              >
                <SelectTrigger
                  className={formState.errors.group ? "border-red-500" : ""}
                  aria-invalid={!!formState.errors.group}
                  aria-describedby={
                    formState.errors.group ? "group-error" : undefined
                  }
                >
                  <SelectValue placeholder="اختر المجموعة" />
                </SelectTrigger>
                <SelectContent>
                  {groupsLoading ? (
                    <SelectItem value={SELECT_STATES.LOADING} disabled>
                      جاري تحميل المجموعات...
                    </SelectItem>
                  ) : groupsError ? (
                    <SelectItem value={SELECT_STATES.ERROR} disabled>
                      خطأ في تحميل المجموعات
                    </SelectItem>
                  ) : (
                    groups.map((group) => (
                      <SelectItem key={group.id} value={group.name}>
                        {group.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {formState.errors.group && (
                <p
                  className="text-sm text-red-500"
                  id="group-error"
                  role="alert"
                >
                  {formState.errors.group}
                </p>
              )}
              {!groupsLoading && !groupsError && groups.length === 0 && (
                <p className="text-xs text-gray-600">
                  لا توجد مجموعات بعد. يرجى إنشاء مجموعة من صفحة الإعدادات
                  أولاً.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentPlan">خطة الدفع</Label>
            <Select
              value={formData.paymentPlan}
              onValueChange={handlePaymentPlanChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one-time">
                  دفعة واحدة ({paymentSettings?.one_time_amount || 6000} ج.م)
                </SelectItem>
                <SelectItem value="monthly">
                  شهري ({paymentSettings?.monthly_amount || 850} ج.م/شهر)
                </SelectItem>
                <SelectItem value="installment">
                  أقساط ({paymentSettings?.installment_amount || 2850} ج.م كل{" "}
                  {paymentSettings?.installment_interval_months || 3} شهور)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="planAmount">
                {formData.paymentPlan === "one-time"
                  ? "إجمالي المبلغ"
                  : formData.paymentPlan === "monthly"
                  ? "المبلغ الشهري"
                  : "مبلغ القسط"}
              </Label>
              <Input
                id="planAmount"
                type="number"
                value={formData.planAmount}
                onChange={(e) =>
                  updateFormData({
                    planAmount: Number.parseInt(e.target.value) || 0,
                  })
                }
                className={formState.errors.planAmount ? "border-red-500" : ""}
              />
              {formState.errors.planAmount && (
                <p className="text-sm text-red-500">
                  {formState.errors.planAmount}
                </p>
              )}
            </div>

            {formData.paymentPlan === "installment" && (
              <div className="space-y-2">
                <Label htmlFor="installmentCount">عدد الأقساط</Label>
                <Input
                  id="installmentCount"
                  type="number"
                  value={formData.installmentCount}
                  onChange={(e) =>
                    updateFormData({
                      installmentCount: Number.parseInt(e.target.value) || 0,
                    })
                  }
                  className={
                    formState.errors.installmentCount ? "border-red-500" : ""
                  }
                />
                {formState.errors.installmentCount && (
                  <p className="text-sm text-red-500">
                    {formState.errors.installmentCount}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paidAmount">المبلغ المدفوع</Label>
              <Input
                id="paidAmount"
                type="number"
                value={formData.paidAmount}
                onChange={(e) =>
                  updateFormData({
                    paidAmount: Number.parseInt(e.target.value) || 0,
                  })
                }
                className={formState.errors.paidAmount ? "border-red-500" : ""}
              />
              {formState.errors.paidAmount && (
                <p className="text-sm text-red-500">
                  {formState.errors.paidAmount}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="enrollmentDate">تاريخ التسجيل</Label>
              <Input
                id="enrollmentDate"
                type="date"
                value={formData.enrollmentDate}
                onChange={(e) =>
                  updateFormData({ enrollmentDate: e.target.value })
                }
                className={
                  formState.errors.enrollmentDate ? "border-red-500" : ""
                }
              />
              {formState.errors.enrollmentDate && (
                <p className="text-sm text-red-500">
                  {formState.errors.enrollmentDate}
                </p>
              )}
            </div>
          </div>

          {/* Payment Plan Summary */}
          {/* Payment Plan Summary */}
          <PaymentSummary
            paymentPlan={formData.paymentPlan}
            planAmount={formData.planAmount}
            installmentCount={formData.installmentCount}
            paidAmount={formData.paidAmount}
          />

          {/* QR Code Display for existing students */}
          {student?.id && (
            <div className="space-y-2">
              <Label>رمز الاستجابة السريعة (QR Code)</Label>
              <QRCodeDisplay
                studentId={student.id}
                studentName={formData.name}
                size={150}
                showStudentInfo={false}
              />
            </div>
          )}
          {/* Display submission error if any */}
          {formState.errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{formState.errors.submit}</p>
            </div>
          )}

          {/* Display groups status messages */}
          {groupsError && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                خطأ في تحميل المجموعات. يرجى إعادة تحميل الصفحة أو التحقق من
                الاتصال.
              </p>
            </div>
          )}

          {!groupsLoading && !groupsError && groups.length === 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                لا توجد مجموعات متاحة. يرجى إنشاء مجموعة من صفحة الإعدادات
                أولاً.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={formState.isSubmitting}
              aria-label="إلغاء وإغلاق النموذج"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={
                formState.isSubmitting ||
                groupsLoading ||
                (groups.length === 0 && !groupsError)
              }
              aria-label={
                formState.isSubmitting
                  ? "جاري الحفظ..."
                  : student
                  ? "حفظ التغييرات"
                  : "إضافة الطالب"
              }
            >
              {formState.isSubmitting
                ? "جاري الحفظ..."
                : groupsLoading
                ? "جاري تحميل المجموعات..."
                : student
                ? "حفظ التغييرات"
                : "إضافة الطالب"}
            </Button>
          </div>

          {/* Keyboard navigation instructions */}
          <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
            <p>• استخدم Tab للتنقل بين الحقول</p>
            <p>• اضغط Escape لإغلاق النموذج</p>
            <p>• اضغط Enter لحفظ النموذج</p>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
