"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Save, Loader2, AlertCircle } from "lucide-react";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";

interface PaymentSettingsProps {
  onStatusChange: (status: string, error?: string) => void;
}

export function PaymentSettings({ onStatusChange }: PaymentSettingsProps) {
  const {
    settings: paymentSettings,
    loading: paymentLoading,
    error: paymentError,
    updateSettings: updatePaymentSettings,
  } = usePaymentSettings();

  // Local state for payment settings form
  const [localPaymentSettings, setLocalPaymentSettings] = useState({
    one_time_amount: 6000,
    monthly_amount: 850,
    installment_amount: 2850,
    installment_interval_months: 3,
    reminder_days: 7,
    payment_threshold: 6000,
  });

  // Update local payment settings when backend data loads
  useEffect(() => {
    if (paymentSettings) {
      setLocalPaymentSettings({
        one_time_amount: paymentSettings.one_time_amount,
        monthly_amount: paymentSettings.monthly_amount,
        installment_amount: paymentSettings.installment_amount,
        installment_interval_months:
          paymentSettings.installment_interval_months,
        reminder_days: paymentSettings.reminder_days,
        payment_threshold: paymentSettings.payment_threshold,
      });
    }
  }, [paymentSettings]);

  const savePaymentSettings = async () => {
    try {
      await updatePaymentSettings(localPaymentSettings);
      onStatusChange("تم حفظ إعدادات المدفوعات بنجاح");
    } catch (error) {
      console.error("Failed to save payment settings:", error);
      onStatusChange("", "فشل في حفظ إعدادات المدفوعات");
    }
  };

  const updateLocalSetting = (
    key: keyof typeof localPaymentSettings,
    value: number
  ) => {
    setLocalPaymentSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">إعدادات المدفوعات</h3>
        {paymentLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      {paymentError && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            خطأ في تحميل إعدادات المدفوعات: {paymentError}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="oneTimeAmount">مبلغ الدفعة الواحدة (ج.م)</Label>
          <Input
            id="oneTimeAmount"
            type="number"
            value={localPaymentSettings.one_time_amount}
            onChange={(e) =>
              updateLocalSetting(
                "one_time_amount",
                Number.parseInt(e.target.value) || 0
              )
            }
            disabled={paymentLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyAmount">المبلغ الشهري (ج.م)</Label>
          <Input
            id="monthlyAmount"
            type="number"
            value={localPaymentSettings.monthly_amount}
            onChange={(e) =>
              updateLocalSetting(
                "monthly_amount",
                Number.parseInt(e.target.value) || 0
              )
            }
            disabled={paymentLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installmentAmount">مبلغ القسط (ج.م)</Label>
          <Input
            id="installmentAmount"
            type="number"
            value={localPaymentSettings.installment_amount}
            onChange={(e) =>
              updateLocalSetting(
                "installment_amount",
                Number.parseInt(e.target.value) || 0
              )
            }
            disabled={paymentLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="installmentInterval">فترة القسط (شهور)</Label>
          <Input
            id="installmentInterval"
            type="number"
            value={localPaymentSettings.installment_interval_months}
            onChange={(e) =>
              updateLocalSetting(
                "installment_interval_months",
                Number.parseInt(e.target.value) || 1
              )
            }
            disabled={paymentLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="reminderDays">أيام التذكير</Label>
          <Input
            id="reminderDays"
            type="number"
            value={localPaymentSettings.reminder_days}
            onChange={(e) =>
              updateLocalSetting(
                "reminder_days",
                Number.parseInt(e.target.value) || 0
              )
            }
            disabled={paymentLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentThreshold">الحد الأدنى للدفع (ج.م)</Label>
          <Input
            id="paymentThreshold"
            type="number"
            value={localPaymentSettings.payment_threshold}
            onChange={(e) =>
              updateLocalSetting(
                "payment_threshold",
                Number.parseInt(e.target.value) || 0
              )
            }
            disabled={paymentLoading}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={savePaymentSettings}
          disabled={paymentLoading}
          size="sm"
        >
          {paymentLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          حفظ إعدادات المدفوعات
        </Button>
      </div>
    </div>
  );
}
