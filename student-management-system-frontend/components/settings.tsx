"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SettingsIcon,
  Save,
  Plus,
  X,
  CheckCircle,
  Download,
  Upload,
  Loader2,
  AlertCircle,
  Edit2,
  Check,
  Users,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import type { AppSettings, BackupMetadata, RestoreResult } from "@/types";
import { useGroups } from "@/hooks/useGroups";
import { usePaymentSettings } from "@/hooks/usePaymentSettings";
import { BackupService } from "@/services/backupService";
import QRCodeManager from "@/components/qr-code-manager";

interface SettingsProps {
  settings: AppSettings;
  onUpdateSettings: (settings: AppSettings) => void;
}

// Utility function to normalize settings data
const normalizeSettings = (settings: AppSettings): AppSettings => ({
  ...settings,
  payment_threshold:
    settings.payment_threshold ?? settings.paymentThreshold ?? 0,
  default_groups: settings.default_groups ?? settings.defaultGroups ?? [],
  enable_audit_log:
    settings.enable_audit_log ?? settings.enableAuditLog ?? false,
  backup_encryption:
    settings.backup_encryption ?? settings.backupEncryption ?? false,
  accessibility_mode:
    settings.accessibility_mode ?? settings.accessibilityMode ?? false,
});

export function Settings({ settings, onUpdateSettings }: SettingsProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(
    normalizeSettings(settings)
  );
  const [newGroup, setNewGroup] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Group management state
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<{
    id: number;
    name: string;
    studentCount: number;
  } | null>(null);
  const [groupStudentCounts, setGroupStudentCounts] = useState<
    Record<number, number>
  >({});
  const [loadingStudentCounts, setLoadingStudentCounts] = useState(false);
  const previousGroupsRef = useRef<string>("");

  // Backup management state
  const [backupInProgress, setBackupInProgress] = useState(false);
  const [restoreInProgress, setRestoreInProgress] = useState(false);
  const [backupPasswordDialogOpen, setBackupPasswordDialogOpen] =
    useState(false);
  const [restorePasswordDialogOpen, setRestorePasswordDialogOpen] =
    useState(false);
  const [backupPassword, setBackupPassword] = useState("");
  const [restorePassword, setRestorePassword] = useState("");
  const [restoreConfirmDialogOpen, setRestoreConfirmDialogOpen] =
    useState(false);
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(
    null
  );
  const [selectedBackupFile, setSelectedBackupFile] = useState<string | null>(
    null
  );

  // Use backend hooks for dynamic data
  const {
    groups,
    loading: groupsLoading,
    error: groupsError,
    mutating: groupsMutating,
    addGroup: addGroupToBackend,
    updateGroup: updateGroupInBackend,
    deleteGroup: deleteGroupFromBackend,
    forceDeleteGroupWithReassignment,
    getStudentCountByGroupId,
  } = useGroups();

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

  // Load student counts for all groups - only when groups actually change
  useEffect(() => {
    const groupsKey = groups
      .map((g) => g.id)
      .sort()
      .join(",");

    // Only load if groups have actually changed and we're not already loading
    if (
      groupsKey !== previousGroupsRef.current &&
      groups.length > 0 &&
      !groupsLoading &&
      !loadingStudentCounts
    ) {
      previousGroupsRef.current = groupsKey;

      let isCancelled = false;

      const loadStudentCounts = async () => {
        setLoadingStudentCounts(true);
        const counts: Record<number, number> = {};

        // Load counts sequentially to avoid overwhelming the backend
        for (const group of groups) {
          if (isCancelled) break; // Exit early if component unmounted

          try {
            counts[group.id] = await getStudentCountByGroupId(group.id);
          } catch (error) {
            console.warn(
              `Could not load student count for group ${group.id}:`,
              error
            );
            counts[group.id] = 0;
          }
        }

        if (!isCancelled) {
          setGroupStudentCounts(counts);
          setLoadingStudentCounts(false);
        }
      };

      loadStudentCounts();

      return () => {
        isCancelled = true;
      };
    }
  }, [groups, groupsLoading, loadingStudentCounts]); // Removed getStudentCountByGroupId to prevent infinite loop

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

  const addGroup = async () => {
    if (!newGroup.trim()) return;

    // Check if group already exists
    if (groups.some((group) => group.name === newGroup.trim())) {
      setSaveError("المجموعة موجودة بالفعل");
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    try {
      const newGroupData = await addGroupToBackend(newGroup.trim());
      setNewGroup("");
      // Update student counts for the new group
      setGroupStudentCounts((prev) => ({ ...prev, [newGroupData.id]: 0 }));
      setSaveStatus("تم إضافة المجموعة بنجاح");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Failed to add group:", error);
      setSaveError("فشل في إضافة المجموعة");
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const startEditingGroup = (groupId: number, currentName: string) => {
    setEditingGroupId(groupId);
    setEditingGroupName(currentName);
  };

  const cancelEditingGroup = () => {
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const saveGroupEdit = async () => {
    if (!editingGroupId || !editingGroupName.trim()) return;

    // Check if group name already exists (excluding current group)
    if (
      groups.some(
        (group) =>
          group.id !== editingGroupId && group.name === editingGroupName.trim()
      )
    ) {
      setSaveError("اسم المجموعة موجود بالفعل");
      setTimeout(() => setSaveError(null), 3000);
      return;
    }

    try {
      await updateGroupInBackend(editingGroupId, editingGroupName.trim());
      setEditingGroupId(null);
      setEditingGroupName("");
      setSaveStatus("تم تحديث اسم المجموعة بنجاح");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Failed to update group:", error);
      setSaveError("فشل في تحديث اسم المجموعة");
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const initiateDeleteGroup = async (groupId: number, groupName: string) => {
    try {
      const studentCount = await getStudentCountByGroupId(groupId);
      setGroupToDelete({ id: groupId, name: groupName, studentCount });
      setDeleteDialogOpen(true);
    } catch (error) {
      console.error("Failed to get student count:", error);
      setSaveError("فشل في التحقق من عدد الطلاب في المجموعة");
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const confirmDeleteGroup = async (forceDelete = false) => {
    if (!groupToDelete) return;

    try {
      let success = false;

      if (forceDelete && groupToDelete.studentCount > 0) {
        // Find a default group to reassign students to
        const defaultGroup = groups.find(
          (g) => g.id !== groupToDelete.id && g.name.includes("الأولى")
        );
        const defaultGroupName = defaultGroup?.name || "المجموعة الأولى";

        success = await forceDeleteGroupWithReassignment(
          groupToDelete.id,
          defaultGroupName
        );
      } else {
        success = await deleteGroupFromBackend(groupToDelete.id);
      }

      if (success) {
        // Remove from student counts
        setGroupStudentCounts((prev) => {
          const newCounts = { ...prev };
          delete newCounts[groupToDelete.id];
          return newCounts;
        });
        setSaveStatus("تم حذف المجموعة بنجاح");
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setSaveError("لا يمكن حذف المجموعة لأنها تحتوي على طلاب");
        setTimeout(() => setSaveError(null), 3000);
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
      setSaveError("فشل في حذف المجموعة");
      setTimeout(() => setSaveError(null), 3000);
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const savePaymentSettings = async () => {
    try {
      await updatePaymentSettings(localPaymentSettings);
      setSaveStatus("تم حفظ إعدادات المدفوعات بنجاح");
      setTimeout(() => setSaveStatus(""), 3000);
    } catch (error) {
      console.error("Failed to save payment settings:", error);
      setSaveError("فشل في حفظ إعدادات المدفوعات");
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  // Backup management functions
  const handleCreateBackup = async () => {
    if (localSettings.backup_encryption || localSettings.backupEncryption) {
      setBackupPasswordDialogOpen(true);
    } else {
      await performBackup();
    }
  };

  const performBackup = async (password?: string) => {
    setBackupInProgress(true);
    setSaveError(null);

    try {
      const metadata = await BackupService.createBackup(password);
      setSaveStatus(
        `تم إنشاء النسخة الاحتياطية بنجاح. الموقع: ${
          metadata.file_path || "المجلد الحالي"
        } — الحجم: ${BackupService.formatFileSize(metadata.file_size)}`
      );
      setTimeout(() => setSaveStatus(""), 5000);
    } catch (error) {
      console.error("Backup failed:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "فشل في إنشاء النسخة الاحتياطية"
      );
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setBackupInProgress(false);
      setBackupPasswordDialogOpen(false);
      setBackupPassword("");
    }
  };

  const handleRestoreBackup = async () => {
    try {
      // Show file picker
      const file = await BackupService.createFileInput(".smsbackup");
      if (!file) {
        return; // User cancelled
      }

      // Store file path
      setSelectedBackupFile(file.name);
      setRestorePasswordDialogOpen(true);
    } catch (error) {
      console.error("File selection failed:", error);
      setSaveError("فشل في اختيار الملف");
      setTimeout(() => setSaveError(null), 3000);
    }
  };

  const performRestore = async (password?: string) => {
    if (!selectedBackupFile) {
      setSaveError("لم يتم اختيار ملف للاستعادة");
      return;
    }

    setRestoreInProgress(true);
    setSaveError(null);

    try {
      const result = await BackupService.restoreBackup(
        selectedBackupFile,
        password
      );

      if (result.success) {
        setSaveStatus(
          `تم استعادة البيانات بنجاح - ${result.students_restored} طالب، ${result.attendance_restored} سجل حضور، ${result.payments_restored} دفعة`
        );
        setTimeout(() => setSaveStatus(""), 5000);

        // Refresh the page to reload all data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setSaveError(`فشل في استعادة البيانات: ${result.errors.join(", ")}`);
        setTimeout(() => setSaveError(null), 5000);
      }
    } catch (error) {
      console.error("Restore failed:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "فشل في استعادة النسخة الاحتياطية"
      );
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setRestoreInProgress(false);
      setRestorePasswordDialogOpen(false);
      setRestoreConfirmDialogOpen(false);
      setRestorePassword("");
      setBackupMetadata(null);
      setSelectedBackupFile(null);
    }
  };

  const validateAndShowRestoreConfirmation = async () => {
    if (!restorePassword && localSettings.backup_encryption) {
      setSaveError("يرجى إدخال كلمة المرور");
      return;
    }

    try {
      // This will be handled by the restore function itself
      setRestorePasswordDialogOpen(false);
      setRestoreConfirmDialogOpen(true);
    } catch (error) {
      console.error("Validation failed:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "فشل في التحقق من النسخة الاحتياطية"
      );
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
          {/* Payment Settings */}
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
                    setLocalPaymentSettings({
                      ...localPaymentSettings,
                      one_time_amount: Number.parseInt(e.target.value) || 0,
                    })
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
                    setLocalPaymentSettings({
                      ...localPaymentSettings,
                      monthly_amount: Number.parseInt(e.target.value) || 0,
                    })
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
                    setLocalPaymentSettings({
                      ...localPaymentSettings,
                      installment_amount: Number.parseInt(e.target.value) || 0,
                    })
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
                    setLocalPaymentSettings({
                      ...localPaymentSettings,
                      installment_interval_months:
                        Number.parseInt(e.target.value) || 1,
                    })
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
                    setLocalPaymentSettings({
                      ...localPaymentSettings,
                      reminder_days: Number.parseInt(e.target.value) || 0,
                    })
                  }
                  disabled={paymentLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentThreshold">
                  الحد الأدنى للدفع (ج.م)
                </Label>
                <Input
                  id="paymentThreshold"
                  type="number"
                  value={localPaymentSettings.payment_threshold}
                  onChange={(e) =>
                    setLocalPaymentSettings({
                      ...localPaymentSettings,
                      payment_threshold: Number.parseInt(e.target.value) || 0,
                    })
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

          {/* Group Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">إدارة المجموعات</h3>
              {(groupsLoading || groupsMutating) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </div>

            {groupsError && (
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  خطأ في تحميل المجموعات: {groupsError}
                </AlertDescription>
              </Alert>
            )}

            {/* Add Group Form */}
            <div className="flex gap-2">
              <Input
                placeholder="اسم المجموعة الجديدة"
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
                disabled={groupsLoading || groupsMutating}
              />
              <Button
                onClick={addGroup}
                size="sm"
                disabled={groupsLoading || groupsMutating || !newGroup.trim()}
              >
                {groupsMutating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                إضافة
              </Button>
            </div>

            {/* Groups List */}
            <div className="space-y-2">
              {groupsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري تحميل المجموعات...
                </div>
              ) : groups.length === 0 ? (
                <div className="text-sm text-gray-500 p-4 text-center border-2 border-dashed border-gray-200 rounded-lg">
                  لا توجد مجموعات. أضف مجموعة جديدة للبدء.
                </div>
              ) : (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      {editingGroupId === group.id ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editingGroupName}
                            onChange={(e) =>
                              setEditingGroupName(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveGroupEdit();
                              if (e.key === "Escape") cancelEditingGroup();
                            }}
                            className="w-48"
                            autoFocus
                            disabled={groupsMutating}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={saveGroupEdit}
                            disabled={
                              groupsMutating || !editingGroupName.trim()
                            }
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={cancelEditingGroup}
                            disabled={groupsMutating}
                          >
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{group.name}</span>
                            <Badge
                              variant="outline"
                              className="flex items-center gap-1"
                            >
                              <Users className="h-3 w-3" />
                              {loadingStudentCounts ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                `${groupStudentCounts[group.id] ?? 0} طالب`
                              )}
                            </Badge>
                          </div>
                        </>
                      )}
                    </div>

                    {editingGroupId !== group.id && (
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            startEditingGroup(group.id, group.name)
                          }
                          disabled={groupsMutating}
                          title="تعديل اسم المجموعة"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            initiateDeleteGroup(group.id, group.name)
                          }
                          disabled={groupsMutating}
                          title="حذف المجموعة"
                          className="hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
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
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "جاري الحفظ..." : "حفظ الإعدادات"}
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

          {saveError && (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {saveError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* QR Code Management */}
      <Card>
        <CardHeader>
          <CardTitle>إدارة رموز الاستجابة السريعة (QR Codes)</CardTitle>
        </CardHeader>
        <CardContent>
          <QRCodeManager />
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
              onClick={handleCreateBackup}
              disabled={backupInProgress || restoreInProgress}
            >
              {backupInProgress ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              <span>
                {backupInProgress
                  ? "جاري إنشاء النسخة..."
                  : "إنشاء نسخة احتياطية"}
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-16 flex-col gap-2 bg-transparent"
              onClick={handleRestoreBackup}
              disabled={backupInProgress || restoreInProgress}
            >
              {restoreInProgress ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              <span>
                {restoreInProgress
                  ? "جاري الاستعادة..."
                  : "استعادة من نسخة احتياطية"}
              </span>
            </Button>
          </div>

          <div className="text-sm text-gray-600 space-y-1">
            <p>• يتم حفظ النسخ الاحتياطية بصيغة مشفرة إذا تم تفعيل التشفير</p>
            <p>
              • تتضمن النسخة الاحتياطية جميع بيانات الطلاب والحضور والمدفوعات
            </p>
            <p>• يُنصح بإنشاء نسخة احتياطية بشكل دوري</p>
            <p>
              • سيتم إعادة تشغيل التطبيق تلقائياً بعد استعادة النسخة الاحتياطية
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Backup Password Dialog */}
      <Dialog
        open={backupPasswordDialogOpen}
        onOpenChange={setBackupPasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-blue-500" />
              إنشاء نسخة احتياطية مشفرة
            </DialogTitle>
            <DialogDescription className="text-right">
              أدخل كلمة مرور لتشفير النسخة الاحتياطية. ستحتاج إلى هذه الكلمة
              لاستعادة البيانات لاحقاً.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backupPassword">كلمة المرور</Label>
              <Input
                id="backupPassword"
                type="password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                placeholder="أدخل كلمة مرور قوية"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && backupPassword.trim()) {
                    performBackup(backupPassword);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setBackupPasswordDialogOpen(false);
                setBackupPassword("");
              }}
              disabled={backupInProgress}
            >
              إلغاء
            </Button>
            <Button
              onClick={() => performBackup(backupPassword)}
              disabled={backupInProgress || !backupPassword.trim()}
            >
              {backupInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              إنشاء النسخة الاحتياطية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Password Dialog */}
      <Dialog
        open={restorePasswordDialogOpen}
        onOpenChange={setRestorePasswordDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-green-500" />
              استعادة من نسخة احتياطية
            </DialogTitle>
            <DialogDescription className="text-right">
              اختر ملف النسخة الاحتياطية وأدخل كلمة المرور إذا كانت مشفرة.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restorePassword">كلمة المرور (اختيارية)</Label>
              <Input
                id="restorePassword"
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="أدخل كلمة المرور إذا كانت النسخة مشفرة"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    validateAndShowRestoreConfirmation();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRestorePasswordDialogOpen(false);
                setRestorePassword("");
              }}
              disabled={restoreInProgress}
            >
              إلغاء
            </Button>
            <Button
              onClick={validateAndShowRestoreConfirmation}
              disabled={restoreInProgress}
            >
              <Upload className="h-4 w-4 mr-2" />
              متابعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <Dialog
        open={restoreConfirmDialogOpen}
        onOpenChange={setRestoreConfirmDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              تأكيد استعادة النسخة الاحتياطية
            </DialogTitle>
            <DialogDescription className="text-right">
              <div className="space-y-3">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">تحذير مهم:</span>
                  </div>
                  <div className="text-red-700 mt-1">
                    <p>
                      ستؤدي هذه العملية إلى استبدال جميع البيانات الحالية
                      بالبيانات من النسخة الاحتياطية. لا يمكن التراجع عن هذه
                      العملية.
                    </p>
                  </div>
                </div>
                <p>هل أنت متأكد من المتابعة؟</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRestoreConfirmDialogOpen(false);
                setRestorePassword("");
              }}
              disabled={restoreInProgress}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => performRestore(restorePassword)}
              disabled={restoreInProgress}
            >
              {restoreInProgress ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              تأكيد الاستعادة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Group Deletion Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              تأكيد حذف المجموعة
            </DialogTitle>
            <DialogDescription className="text-right">
              {groupToDelete && (
                <div className="space-y-2">
                  <p>هل أنت متأكد من حذف المجموعة "{groupToDelete.name}"؟</p>
                  {groupToDelete.studentCount > 0 ? (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2 text-orange-800">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">تحذير:</span>
                      </div>
                      <div className="text-orange-700 mt-1">
                        <p>
                          هذه المجموعة تحتوي على {groupToDelete.studentCount}{" "}
                          طالب. سيتم نقل الطلاب إلى "المجموعة الأولى" تلقائياً.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-600">
                      هذه المجموعة فارغة ويمكن حذفها بأمان.
                    </p>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={groupsMutating}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                confirmDeleteGroup(
                  groupToDelete ? groupToDelete.studentCount > 0 : false
                )
              }
              disabled={groupsMutating}
            >
              {groupsMutating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {groupToDelete && groupToDelete.studentCount > 0
                ? "حذف مع نقل الطلاب"
                : "حذف المجموعة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
