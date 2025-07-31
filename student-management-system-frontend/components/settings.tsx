"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  SettingsIcon,
  Save,
  Plus,
  X,
  CheckCircle,
  Download,
  Upload,
} from "lucide-react";
import type { AppSettings } from "@/types";

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

export function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const [newGroup, setNewGroup] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setSaveStatus("تم حفظ الإعدادات بنجاح");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const addGroup = () => {
    const defaultGroups =
      localSettings.default_groups || localSettings.defaultGroups || [];
    if (newGroup.trim() && !defaultGroups.includes(newGroup.trim())) {
      setLocalSettings({
        ...localSettings,
        default_groups: [...defaultGroups, newGroup.trim()],
        defaultGroups: [...defaultGroups, newGroup.trim()], // Keep both for compatibility
      });
      setNewGroup("");
    }
  };

  const removeGroup = (groupToRemove: string) => {
    const defaultGroups =
      localSettings.default_groups || localSettings.defaultGroups || [];
    const filteredGroups = defaultGroups.filter(
      (group) => group !== groupToRemove
    );
    setLocalSettings({
      ...localSettings,
      default_groups: filteredGroups,
      defaultGroups: filteredGroups, // Keep both for compatibility
    });
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
          {/* Payment Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إعدادات المدفوعات</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentThreshold">
                  الحد الأدنى للدفع (ج.م)
                </Label>
                <Input
                  id="paymentThreshold"
                  type="number"
                  value={
                    localSettings.payment_threshold ||
                    localSettings.paymentThreshold ||
                    0
                  }
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      payment_threshold: Number.parseInt(e.target.value) || 0,
                      paymentThreshold: Number.parseInt(e.target.value) || 0, // Keep both for compatibility
                    })
                  }
                />
              </div>
            </div>
          </div>

          {/* Group Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">إدارة المجموعات</h3>

            <div className="flex gap-2">
              <Input
                placeholder="اسم المجموعة الجديدة"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addGroup()}
              />
              <Button onClick={addGroup} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                localSettings.default_groups ||
                localSettings.defaultGroups ||
                []
              ).map((group) => (
                <Badge
                  key={group}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {group}
                  <button
                    onClick={() => removeGroup(group)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

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
                  checked={
                    localSettings.enable_audit_log ||
                    localSettings.enableAuditLog ||
                    false
                  }
                  onCheckedChange={(checked) =>
                    setLocalSettings({
                      ...localSettings,
                      enable_audit_log: checked,
                      enableAuditLog: checked, // Keep both for compatibility
                    })
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
                  checked={
                    localSettings.backup_encryption ||
                    localSettings.backupEncryption ||
                    false
                  }
                  onCheckedChange={(checked) =>
                    setLocalSettings({
                      ...localSettings,
                      backup_encryption: checked,
                      backupEncryption: checked, // Keep both for compatibility
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
                  checked={
                    localSettings.accessibility_mode ||
                    localSettings.accessibilityMode ||
                    false
                  }
                  onCheckedChange={(checked) =>
                    setLocalSettings({
                      ...localSettings,
                      accessibility_mode: checked,
                      accessibilityMode: checked, // Keep both for compatibility
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
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              حفظ الإعدادات
            </Button>
          </div>

          {saveStatus && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {saveStatus}
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
