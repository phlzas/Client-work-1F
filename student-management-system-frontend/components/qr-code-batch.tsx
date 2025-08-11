"use client";

import React, { useState, useEffect } from "react";
import { qrCodeApi } from "@/lib/api";
import type { QRCodeBatch, QRCodeData } from "@/types";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  Loader2,
  FileText,
  Printer,
  Users,
  Download,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QRCodeDisplay from "./qr-code-display";

interface QRCodeBatchProps {
  onClose?: () => void;
}

export function QRCodeBatch({ onClose }: QRCodeBatchProps) {
  const [batches, setBatches] = useState<QRCodeBatch[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [expandedBatch, setExpandedBatch] = useState<string | null>(null);

  useEffect(() => {
    loadQRCodeBatches();
  }, []);

  const loadQRCodeBatches = async () => {
    try {
      setLoading(true);
      setError(null);

      const batchData = await qrCodeApi.generateQRCodesByGroup();
      setBatches(batchData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "فشل في تحميل رموز الاستجابة السريعة"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportAllToPDF = async () => {
    try {
      setExporting(true);

      // Use a simple filename for now - the backend will handle the file path
      const fileName = `qr-codes-all-groups-${Date.now()}.pdf`;
      const filePath = fileName;

      await qrCodeApi.exportQRCodesByGroupToPDF(filePath);

      const totalStudents = batches.reduce(
        (total, batch) => total + batch.qr_codes.length,
        0
      );
      alert(
        `تم تصدير جميع رموز الاستجابة السريعة بنجاح!\nإجمالي الطلاب: ${totalStudents}\nعدد المجموعات: ${batches.length}`
      );
    } catch (err) {
      console.error("Batch export failed:", err);
      alert(
        "فشل في تصدير رموز الاستجابة السريعة: " +
          (err instanceof Error ? err.message : "خطأ غير معروف")
      );
    } finally {
      setExporting(false);
    }
  };

  const handleExportGroupToPDF = async (groupName: string) => {
    try {
      setExporting(true);

      // Use a simple filename for now - the backend will handle the file path
      const fileName = `qr-codes-${groupName}-${Date.now()}.pdf`;
      const filePath = fileName;

      await qrCodeApi.exportQRCodesByGroupToPDF(filePath, groupName);

      const groupBatch = batches.find(
        (batch) => batch.group_name === groupName
      );
      const studentCount = groupBatch ? groupBatch.qr_codes.length : 0;

      alert(
        `تم تصدير رموز الاستجابة السريعة لمجموعة ${groupName} بنجاح!\nعدد الطلاب: ${studentCount}`
      );
    } catch (err) {
      console.error("Group export failed:", err);
      alert(
        "فشل في تصدير رموز الاستجابة السريعة: " +
          (err instanceof Error ? err.message : "خطأ غير معروف")
      );
    } finally {
      setExporting(false);
    }
  };

  const filteredBatches =
    selectedGroup === "all"
      ? batches
      : batches.filter((batch) => batch.group_name === selectedGroup);

  const allGroups = batches.map((batch) => batch.group_name);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-gray-600">
          جاري تحميل رموز الاستجابة السريعة...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-6 w-6 ml-3" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          إدارة رموز الاستجابة السريعة
        </h2>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            إغلاق
          </Button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">المجموعة:</span>
          <Select value={selectedGroup} onValueChange={setSelectedGroup}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="اختر المجموعة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع المجموعات</SelectItem>
              {allGroups.map((group) => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleExportAllToPDF}
          disabled={exporting}
          className="flex items-center gap-2"
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          تصدير الكل PDF
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              إجمالي المجموعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {batches.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              إجمالي الطلاب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {batches.reduce(
                (total, batch) => total + batch.qr_codes.length,
                0
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              المجموعات المعروضة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {filteredBatches.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Batches */}
      <div className="space-y-4">
        {filteredBatches.map((batch) => (
          <Card key={batch.group_name} className="overflow-hidden">
            <CardHeader className="bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-600" />
                  <div>
                    <CardTitle className="text-lg">
                      {batch.group_name}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {batch.qr_codes.length} طالب
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportGroupToPDF(batch.group_name)}
                    disabled={exporting}
                    className="flex items-center gap-2"
                  >
                    {exporting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4" />
                    )}
                    تصدير PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setExpandedBatch(
                        expandedBatch === batch.group_name
                          ? null
                          : batch.group_name
                      )
                    }
                  >
                    {expandedBatch === batch.group_name ? "إخفاء" : "عرض"}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {expandedBatch === batch.group_name && (
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {batch.qr_codes.map((qrCode) => (
                    <div
                      key={qrCode.student_id}
                      className="border rounded-lg p-4"
                    >
                      <QRCodeDisplay
                        studentId={qrCode.student_id}
                        studentName={qrCode.student_name}
                        size={150}
                        showStudentInfo={true}
                        showActions={false}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {filteredBatches.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            لا توجد مجموعات
          </h3>
          <p className="text-gray-600">
            لا توجد مجموعات تحتوي على طلاب لإنشاء رموز الاستجابة السريعة لها.
          </p>
        </div>
      )}
    </div>
  );
}

// Remove default export to avoid naming conflicts with types
