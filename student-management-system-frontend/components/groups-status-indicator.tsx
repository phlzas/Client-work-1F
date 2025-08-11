"use client";

import { AlertCircle, Loader2, Info } from "lucide-react";

interface GroupsStatusIndicatorProps {
  loading: boolean;
  error: string | null;
  groupsCount: number;
  className?: string;
}

export function GroupsStatusIndicator({
  loading,
  error,
  groupsCount,
  className = "",
}: GroupsStatusIndicatorProps) {
  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <p className="text-sm text-blue-800">جاري تحميل المجموعات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md ${className}`}
      >
        <AlertCircle className="h-4 w-4 text-red-600" />
        <div className="text-sm text-red-800">
          <p className="font-medium">خطأ في تحميل المجموعات</p>
          <p className="text-xs mt-1">
            يرجى إعادة تحميل الصفحة أو التحقق من الاتصال
          </p>
        </div>
      </div>
    );
  }

  if (groupsCount === 0) {
    return (
      <div
        className={`flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md ${className}`}
      >
        <Info className="h-4 w-4 text-yellow-600" />
        <div className="text-sm text-yellow-800">
          <p className="font-medium">لا توجد مجموعات متاحة</p>
          <p className="text-xs mt-1">
            يرجى إنشاء مجموعة من صفحة الإعدادات أولاً
          </p>
        </div>
      </div>
    );
  }

  return null;
}
