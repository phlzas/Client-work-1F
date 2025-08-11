"use client";

import React, { useState, useEffect } from "react";
import { qrCodeApi } from "@/lib/api";
import type { QRCodeData } from "@/types";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, FileText, Printer, QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  studentId: string;
  studentName?: string;
  size?: number;
  showStudentInfo?: boolean;
  showActions?: boolean;
}

export function QRCodeDisplay({
  studentId,
  studentName,
  size = 200,
  showStudentInfo = true,
  showActions = true,
}: QRCodeDisplayProps) {
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null);
  const [qrCodeImage, setQRCodeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get QR code data with student information
        const data = await qrCodeApi.generateQRCodeForStudent(studentId);
        setQRCodeData(data);

        // Get the actual QR code image as base64
        const imageData = await qrCodeApi.generateQRCodeForStudentId(studentId);
        setQRCodeImage(imageData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "فشل في إنشاء رمز الاستجابة السريعة"
        );
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      generateQRCode();
    }
  }, [studentId]);

  const handleExportPDF = async () => {
    if (!qrCodeData) return;

    try {
      setExporting(true);

      // Use a simple filename for now - the backend will handle the file path
      const fileName = `qr-code-${qrCodeData.student_id}-${Date.now()}.pdf`;
      const filePath = fileName;

      await qrCodeApi.exportQRCodesToPDF(
        [qrCodeData],
        filePath,
        `QR Code - ${qrCodeData.student_name}`
      );

      // Show success message with more details
      alert(
        `تم تصدير رمز الاستجابة السريعة بنجاح!\nالطالب: ${qrCodeData.student_name}\nالمجموعة: ${qrCodeData.group_name}`
      );
    } catch (err) {
      console.error("QR code export failed:", err);
      alert(
        "فشل في تصدير رمز الاستجابة السريعة: " +
          (err instanceof Error ? err.message : "خطأ غير معروف")
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadData = () => {
    if (!qrCodeData) return;

    const dataStr = `Student QR Code Data
Name: ${qrCodeData.student_name}
ID: ${qrCodeData.student_id}
Group: ${qrCodeData.group_name}
Generated: ${new Date().toLocaleString("ar-EG")}
QR Code Content: ${qrCodeData.student_id}`;

    const dataBlob = new Blob([dataStr], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `qr-data-${qrCodeData.student_id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTestQRCode = async () => {
    if (!qrCodeData) return;

    try {
      // Test QR code validation
      const isValid = await qrCodeApi.validateQRCode(qrCodeData.student_id);

      if (isValid) {
        alert(
          `✅ اختبار رمز الاستجابة السريعة نجح!\nالطالب: ${qrCodeData.student_name}\nالرقم: ${qrCodeData.student_id}`
        );
      } else {
        alert(
          `❌ فشل اختبار رمز الاستجابة السريعة\nالرقم: ${qrCodeData.student_id}`
        );
      }
    } catch (err) {
      console.error("QR code test failed:", err);
      alert(
        `❌ خطأ في اختبار رمز الاستجابة السريعة: ${
          err instanceof Error ? err.message : "خطأ غير معروف"
        }`
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">
          جاري إنشاء رمز الاستجابة السريعة...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center text-red-600">
          <AlertCircle className="h-5 w-5 ml-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!qrCodeData) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <span className="text-gray-500">
          لا توجد بيانات رمز الاستجابة السريعة
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* QR Code Image */}
      <div
        className="bg-white p-4 border border-gray-300 rounded-lg shadow-inner"
        style={{ width: size + 32, height: size + 32 }}
      >
        {qrCodeImage ? (
          <img
            src={`data:image/png;base64,${qrCodeImage}`}
            alt={`QR Code for ${qrCodeData.student_name}`}
            className="w-full h-full object-contain"
            style={{ width: size, height: size }}
          />
        ) : (
          <div
            className="bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-mono border-2 border-dashed border-gray-300"
            style={{ width: size, height: size }}
          >
            <div className="text-center p-2">
              <div className="mb-2">QR Code</div>
              <div className="text-xs break-all">{qrCodeData.student_id}</div>
            </div>
          </div>
        )}
      </div>

      {/* Student Information */}
      {showStudentInfo && (
        <div className="mt-4 text-center">
          <h3 className="font-semibold text-gray-900 text-lg">
            {qrCodeData.student_name || studentName}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <span className="font-medium">الرقم التعريفي:</span>{" "}
            {qrCodeData.student_id}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">المجموعة:</span>{" "}
            {qrCodeData.group_name}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={handleExportPDF}
            disabled={exporting}
            className="flex items-center gap-2"
            size="sm"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            تصدير PDF
          </Button>

          <Button
            onClick={handleDownloadData}
            variant="outline"
            className="flex items-center gap-2"
            size="sm"
          >
            <FileText className="h-4 w-4" />
            تحميل البيانات
          </Button>

          <Button
            onClick={handleTestQRCode}
            variant="secondary"
            className="flex items-center gap-2"
            size="sm"
          >
            <QrCode className="h-4 w-4" />
            اختبار الرمز
          </Button>
        </div>
      )}
    </div>
  );
}

export default QRCodeDisplay;
