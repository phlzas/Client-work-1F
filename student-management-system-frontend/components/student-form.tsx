"use client";

import type React from "react";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type { Student, AppSettings } from "@/types";
import { useGroups } from "@/hooks/useGroups";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

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

export function StudentForm({ student, onSubmit, onClose }: StudentFormProps) {
  const { groups, loading: groupsLoading, error: groupsError } = useGroups();
  const { settings: paymentSettings } = usePaymentSettings();

  // Simplified form state with better typing
  const [formData, setFormData] = useState({
    name: "",
    group: "",
    paymentPlan: "one-time" as "one-time" | "monthly" | "installment",
    planAmount: 6000,
    installmentCount: 3,
    paidAmount: 0,
    enrollmentDate: new Date().toISOString().split("T")[0],
    paymentStatus: "pending" as "paid" | "pending" | "overdue" | "due_soon",
  });

  const [formState, setFormState] = useState({
    errors: {} as Record<string, string>,
    isSubmitting: false,
    isDirty: false,
  });

  useEffect(() => {
    if (student) {
      setFormData({
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
      });
    }
  }, [student]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "اسم الطالب مطلوب";
    }

    if (!formData.group.trim()) {
      newErrors.group = "المجموعة مطلوبة";
    }

    if (formData.planAmount <= 0) {
      newErrors.planAmount = "مبلغ الخطة يجب أن يكون أكبر من صفر";
    }

    if (formData.paidAmount < 0) {
      newErrors.paidAmount = "المبلغ المدفوع لا يمكن أن يكون سالباً";
    }

    if (
      formData.paymentPlan === "installment" &&
      formData.installmentCount <= 0
    ) {
      newErrors.installmentCount = "عدد الأقساط يجب أن يكون أكبر من صفر";
    }

    setFormState((prev) => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

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

      const studentData = {
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
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString(), // Keep both for compatibility
        updated_at: new Date().toISOString(),
        updatedAt: new Date().toISOString(), // Keep both for compatibility
      };

      if (student) {
        console.log("Updating existing student:", student.id);
        onSubmit({
          ...student,
          ...studentData,
        });
      } else {
        console.log("Adding new student");
        onSubmit(studentData as any);
      }
    } catch (error) {
      console.error("Error in form submission:", error);
      setFormState((prev) => ({
        ...prev,
        errors: { ...prev.errors, submit: "حدث خطأ أثناء حفظ البيانات" },
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

  const handlePaymentPlanChange = (
    plan: "one-time" | "monthly" | "installment"
  ) => {
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

    setFormData({
      ...formData,
      paymentPlan: plan,
      planAmount: newPlanAmount,
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        dir="rtl"
      >
        <DialogHeader>
          <DialogTitle>
            {student ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الطالب *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="أدخل اسم الطالب"
                className={formState.errors.name ? "border-red-500" : ""}
              />
              {formState.errors.name && (
                <p className="text-sm text-red-500">{formState.errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">المجموعة *</Label>
              <Select
                value={formData.group}
                onValueChange={(value) =>
                  setFormData({ ...formData, group: value })
                }
              >
                <SelectTrigger
                  className={formState.errors.group ? "border-red-500" : ""}
                >
                  <SelectValue placeholder="اختر المجموعة" />
                </SelectTrigger>
                <SelectContent>
                  {groupsLoading ? (
                    <SelectItem value="" disabled>
                      جاري تحميل المجموعات...
                    </SelectItem>
                  ) : groupsError ? (
                    <SelectItem value="" disabled>
                      خطأ في تحميل المجموعات
                    </SelectItem>
                  ) : groups.length === 0 ? (
                    <SelectItem value="" disabled>
                      لا توجد مجموعات متاحة
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
                <p className="text-sm text-red-500">{formState.errors.group}</p>
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
                  setFormData({
                    ...formData,
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
                    setFormData({
                      ...formData,
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
                  setFormData({
                    ...formData,
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
                  setFormData({ ...formData, enrollmentDate: e.target.value })
                }
              />
            </div>
          </div>

          {/* Payment Plan Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">ملخص خطة الدفع</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {formData.paymentPlan === "one-time" && (
                <p>دفعة واحدة: {formData.planAmount.toLocaleString()} ج.م</p>
              )}
              {formData.paymentPlan === "monthly" && (
                <p>
                  دفع شهري: {formData.planAmount.toLocaleString()} ج.م كل شهر
                </p>
              )}
              {formData.paymentPlan === "installment" && (
                <>
                  <p>عدد الأقساط: {formData.installmentCount}</p>
                  <p>مبلغ القسط: {formData.planAmount.toLocaleString()} ج.م</p>
                  <p>
                    إجمالي المبلغ:{" "}
                    {(
                      formData.planAmount * formData.installmentCount
                    ).toLocaleString()}{" "}
                    ج.م
                  </p>
                </>
              )}
              <p>المبلغ المدفوع: {formData.paidAmount.toLocaleString()} ج.م</p>
              <p>
                المتبقي:{" "}
                {(formData.paymentPlan === "installment"
                  ? formData.planAmount * formData.installmentCount -
                    formData.paidAmount
                  : formData.planAmount - formData.paidAmount
                ).toLocaleString()}{" "}
                ج.م
              </p>
            </CardContent>
          </Card>

          {/* Display submission error if any */}
          {formState.errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{formState.errors.submit}</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={formState.isSubmitting}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={formState.isSubmitting}>
              {formState.isSubmitting
                ? "جاري الحفظ..."
                : student
                ? "حفظ التغييرات"
                : "إضافة الطالب"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
