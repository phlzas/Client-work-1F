"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SettingsIcon,
  Save,
  CheckCircle,
  Download,
  Upload,
} from "lucide-react";
import type { AppSettings } from "@/types";
import { GroupManagement } from "@/components/group-management";
import { PaymentSettings } from "@/components/payment-settings";

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

// Utility function to normalize settings data
const normalizeSettings = (settings: AppSettings): AppSettings => ({
  ...settings,
  payment_threshold: settings.payment_threshold,
  default_groups: settings.default_groups,
  enable_audit_log: settings.enable_audit_log,
  backup_encryption: settings.backup_encryption,
  accessibility_mode: settings.accessibility_mode,
});

export function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(
    normalizeSettings(settings)
  );
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Centralized status handler for child components
  const handleStatusChange = useCallback((status: string, error?: string) => {
    if (error) {
      setSaveError(error);
      setTimeout(() => setSaveError(null), 3000);
    } else {
      setSaveStatus(status);
      setTimeout(() => setSaveStatus(""), 3000);
    }
  }, []);

  // Helper function to update settings with both naming conventions
  const updateSetting = useCallback((key: string, value: any) => {
    const camelCaseKey = key.replace(/_([a-z])/g, (_, letter) =>
      letter.toUpperCase()
    );
    setLocalSettings((prev) => ({
      ...prev,
      [key]: value,
      [camelCaseKey]: value, // Keep both for compatibility
    }));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await onUpdateSettings(localSettings);
      setSaveStatus("تم حفظ الإعدادات بنجاح");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الإعدادات"
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            إعدادات النظام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Settings Component */}
          <PaymentSettings onStatusChange={handleStatusChange} />

          {/* Group Management Component */}
          <GroupManagement onStatusChange={handleStatusChange} />

          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إعدادات النظام</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="enableAuditLog">تفعيل سجل المراجعة</Label>
                  <p className="text-sm text-gray-600">
                    تسجيل جميع التغييرات في النظام
                  </p>
                </div>
                <Switch
                  id="enableAuditLog"
                  checked={localSettings.enable_audit_log}
                  onCheckedChange={(checked) =>
                    updateSetting("enable_audit_log", checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="backupEncryption">
                    تشفير النسخ الاحتياطية
                  </Label>
                  <p className="text-sm text-gray-600">
                    حماية النسخ الاحتياطية بكلمة مرور
                  </p>
                </div>
                <Switch
                  id="backupEncryption"
                  checked={localSettings.backup_encryption}
                  onCheckedChange={(checked) =>
                    setLocalSettings({
                      ...localSettings,
                      backup_encryption: checked,
                    })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="accessibilityMode">وضع إمكانية الوصول</Label>
                  <p className="text-sm text-gray-600">
                    تحسينات للمستخدمين ذوي الاحتياجات الخاصة
                  </p>
                </div>
                <Switch
                  id="accessibilityMode"
                  checked={localSettings.accessibility_mode}
                  onCheckedChange={(checked) =>
                    setLocalSettings({
                      ...localSettings,
                      accessibility_mode: checked,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">اللغة</Label>
                <Select
                  value={localSettings.language}
                  onValueChange={(value: "en" | "ar") =>
                    setLocalSettings({
                      ...localSettings,
                      language: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="theme">المظهر</Label>
                <Select
                  value={localSettings.theme}
                  onValueChange={(value: "light" | "dark") =>
                    setLocalSettings({
                      ...localSettings,
                      theme: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">فاتح</SelectItem>
                    <SelectItem value="dark">داكن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
            </Button>
          </div>

          {/* Status Messages */}
          {saveStatus && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {saveStatus}
              </AlertDescription>
            </Alert>
          )}

          {saveError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {saveError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Backup & Restore */}
      <Card>
        <CardHeader>
          <CardTitle>النسخ الاحتياطي والاستعادة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-16 flex-col gap-2 bg-transparent"
            >
              <Download className="h-5 w-5" />
              <span>إنشاء نسخة احتياطية</span>
            </Button>

            <Button
              variant="outline"
              className="h-16 flex-col gap-2 bg-transparent"
            >
              <Upload className="h-5 w-5" />
              <span>استعادة من نسخة احتياطية</span>
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>• يتم حفظ النسخ الاحتياطية بصيغة مشفرة إذا تم تفعيل التشفير</p>
            <p>
              • تتضمن النسخة الاحتياطية جميع بيانات الطلاب والحضور والمدفوعات
            </p>
            <p>• يُنصح بإنشاء نسخة احتياطية بشكل دوري</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
